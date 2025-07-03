import { supabase } from './supabase';

export class SupabaseStorageService {
  private readonly BUCKET_NAME = 'form-attachments';

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: File, 
    path: string, 
    options?: { 
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<{ path: string; url: string }> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: publicUrl
    };
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string = ''): Promise<any[]> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .list(path);

    if (error) {
      console.error('List files error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data || [];
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService(); 