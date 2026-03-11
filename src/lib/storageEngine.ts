import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

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
