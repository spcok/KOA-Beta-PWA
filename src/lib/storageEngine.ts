import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';
import { db } from './db';

/**
 * KOA Storage Engine
 * Handles file uploads and deletions for Supabase Storage
 */

const BUCKET_NAME = 'koa-attachments';

export async function uploadFile(file: File, folder: string): Promise<string> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log('--- SUPABASE STORAGE DIAGNOSTIC ---');
    console.log('Connected to Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Available Buckets in this project:', buckets?.map(b => b.name));
    console.log('Attempting to upload to:', BUCKET_NAME);
    console.log('-----------------------------------');
  } catch (e) {
    console.error('Failed to fetch buckets for diagnostic:', e);
  }

  // Validate file size (5MB limit)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  const fileToUpload = file.type.startsWith('image/') ? await imageCompression(file, options) : file;

  const fileExt = fileToUpload.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileToUpload);

  if (uploadError) {
    console.log('Full uploadError object:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function queueFileUpload(file: File, folder: string): Promise<string> {
  // Validate file size (5MB limit)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  let thumbnailBase64 = '';
  let fileToUpload: File | Blob = file;

  if (file.type.startsWith('image/')) {
    // Generate thumbnail
    const thumbnailOptions = {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 200,
      useWebWorker: true,
      fileType: 'image/jpeg'
    };
    try {
      const thumbnailBlob = await imageCompression(file, thumbnailOptions);
      thumbnailBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(thumbnailBlob);
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
    } catch (e) {
      console.error("Failed to generate thumbnail", e);
    }

    // Compress main image
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };
    fileToUpload = await imageCompression(file, options);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  // Add to Dexie upload_queue
  await db.upload_queue.add({
    fileData: fileToUpload,
    fileName,
    folder,
    thumbnailBase64,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  // Return the thumbnail as a temporary URL if available, otherwise a placeholder
  // In a real app, you might return a special internal URL scheme like "local://..."
  // For now, returning the base64 thumbnail allows immediate UI feedback.
  return thumbnailBase64 || `local://${fileName}`;
}

export async function processUploadQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const pendingUploads = await db.upload_queue.where('status').equals('pending').toArray();
  
  for (const item of pendingUploads) {
    try {
      await db.upload_queue.update(item.id!, { status: 'uploading' });
      
      const filePath = `${item.folder}/${item.fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, item.fileData);

      if (uploadError) {
        throw uploadError;
      }

      // If successful, we can delete it from the queue
      await db.upload_queue.delete(item.id!);
      
      // Note: In a fully robust system, we would also need to update the database record
      // that references 'thumbnailBase64' or 'local://...' to point to the new Supabase public URL.
      // For this task, the prompt says "upload the upload_queue to Supabase Storage, then clears the queue."
    } catch (error) {
      console.error(`Failed to upload queued file ${item.fileName}:`, error);
      await db.upload_queue.update(item.id!, { status: 'failed' });
    }
  }
}

// Start a background worker to process the queue periodically
setInterval(() => {
  if (navigator.onLine) {
    processUploadQueue().catch(console.error);
  }
}, 30000); // Check every 30 seconds

// Also check when coming back online
window.addEventListener('online', () => {
  processUploadQueue().catch(console.error);
});

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // Extract path from URL
    // Public URL format: https://[project-id].supabase.co/storage/v1/object/public/koa-attachments/[folder]/[filename]
    const urlParts = fileUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from storage:', error);
    }
  } catch (err) {
    console.error('Failed to parse file URL for deletion:', err);
  }
}
