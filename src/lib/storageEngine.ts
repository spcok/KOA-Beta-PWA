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

export async function queueFileUpload(file: File, folder: string, recordId: string, tableName: string, columnName: string): Promise<{ attachment_url: string, thumbnail_url: string }> {
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  let thumbnailBase64 = '';

  if (file.type.startsWith('image/')) {
    thumbnailBase64 = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch {
          reject(new Error('Image too large for offline storage or processing failed.'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for thumbnail generation.'));
      img.src = url;
    });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  await db.media_upload_queue.add({
    fileData: file,
    fileName,
    folder,
    recordId,
    tableName,
    columnName,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  return { attachment_url: `local://${fileName}`, thumbnail_url: thumbnailBase64 };
}

export async function processMediaUploadQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const pendingUploads = await db.media_upload_queue.where('status').equals('pending').toArray();
  
  for (const item of pendingUploads) {
    try {
      await db.media_upload_queue.update(item.id!, { status: 'uploading' });
      
      const filePath = `${item.folder}/${item.fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, item.fileData);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update the actual record in Supabase with the new public URL
      const { error: updateError } = await supabase
        .from(item.tableName)
        .update({ [item.columnName]: publicUrl })
        .eq('id', item.recordId);

      if (updateError) {
        throw updateError;
      }

      // Also update local Dexie record
      const localTable = db.table(item.tableName);
      if (localTable) {
        await localTable.update(item.recordId, { [item.columnName]: publicUrl });
      }

      await db.media_upload_queue.delete(item.id!);
    } catch (error) {
      console.error(`Failed to upload queued media ${item.fileName}:`, error);
      await db.media_upload_queue.update(item.id!, { status: 'failed' });
    }
  }
}

// Start a background worker to process the queue periodically
setInterval(() => {
  if (navigator.onLine) {
    processMediaUploadQueue().catch(console.error);
  }
}, 30000); // Check every 30 seconds

// Also check when coming back online
window.addEventListener('online', () => {
  processMediaUploadQueue().catch(console.error);
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
