import { useState, useEffect, useCallback } from "react";

// 从API获取的笔记类型定义
export type ApiNote = {
  path: string;
  relative_path: string;
  title: string;
  tags: string[];
  last_modified: number;
  preview: string;
  content: string;
};

// 从API获取的文件夹类型定义
export type ApiFolder = {
  name: string;
  path: string;
  relative_path: string;
};

// 从API获取的图片类型定义
export type ApiImage = {
  name: string;
  path: string;
  relative_path: string;
  size: number;
  last_modified: number;
};

// 构建文件URL (用于图片等资源)
export function getFileUrl(relativePath: string): string {
  return `/api/file/${encodeURIComponent(relativePath)}`;
}

// 重试函数
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    
    // 如果是服务器错误，且还有重试次数，则重试
    if (response.status >= 500 && retries > 0) {
      console.log(`请求失败，${delay}ms后重试，剩余重试次数: ${retries-1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    
    return response;
  } catch (err) {
    if (retries > 0) {
      console.log(`网络请求异常，${delay}ms后重试，剩余重试次数: ${retries-1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [images, setImages] = useState<ApiImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 获取所有笔记
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithRetry('/api/notes');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`获取笔记失败: ${errorDetail}`);
      }
      
      const data = await response.json();
      setNotes(data);
      setError(null);
    } catch (err) {
      console.error('获取笔记错误:', err);
      setError(err instanceof Error ? err.message : '获取笔记时发生未知错误');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 获取所有文件夹
  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetchWithRetry('/api/folders');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`获取文件夹失败: ${errorDetail}`);
      }
      
      const data = await response.json();
      setFolders(data);
    } catch (err) {
      console.error('获取文件夹错误:', err);
      setError(err instanceof Error ? err.message : '获取文件夹时发生未知错误');
    }
  }, []);
  
  // 获取所有图片
  const fetchImages = useCallback(async () => {
    try {
      const response = await fetchWithRetry('/api/images');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`获取图片失败: ${errorDetail}`);
      }
      
      const data = await response.json();
      setImages(data);
    } catch (err) {
      console.error('获取图片错误:', err);
      setError(err instanceof Error ? err.message : '获取图片时发生未知错误');
    }
  }, []);
  
  // 保存新笔记
  const saveNote = useCallback(async (title: string, content: string, folder?: string) => {
    try {
      const response = await fetchWithRetry('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          folder,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`保存笔记失败: ${errorDetail}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 刷新笔记列表
        await fetchNotes();
        return result;
      } else {
        throw new Error(result.error || '保存笔记失败');
      }
    } catch (err) {
      console.error('保存笔记错误:', err);
      throw err;
    }
  }, [fetchNotes]);
  
  // 更新现有笔记
  const updateNote = useCallback(async (path: string, content: string) => {
    try {
      const response = await fetchWithRetry('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          content,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`更新笔记失败: ${errorDetail}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 刷新笔记列表
        await fetchNotes();
        return result;
      } else {
        throw new Error(result.error || '更新笔记失败');
      }
    } catch (err) {
      console.error('更新笔记错误:', err);
      throw err;
    }
  }, [fetchNotes]);
  
  // 删除笔记
  const deleteNote = useCallback(async (path: string) => {
    try {
      const response = await fetchWithRetry('/api/notes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`删除笔记失败: ${errorDetail}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 刷新笔记列表
        await fetchNotes();
        return result;
      } else {
        throw new Error(result.error || '删除笔记失败');
      }
    } catch (err) {
      console.error('删除笔记错误:', err);
      throw err;
    }
  }, [fetchNotes]);
  
  // 创建新文件夹
  const createFolder = useCallback(async (folderName: string) => {
    try {
      const response = await fetchWithRetry('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderName,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`创建文件夹失败: ${errorDetail}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 刷新文件夹列表
        await fetchFolders();
        return result;
      } else {
        throw new Error(result.error || '创建文件夹失败');
      }
    } catch (err) {
      console.error('创建文件夹错误:', err);
      throw err;
    }
  }, [fetchFolders]);
  
  // 初始加载数据
  useEffect(() => {
    // 加载所有数据
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 首先获取文件夹，然后是笔记，最后是图片
        try {
          await fetchFolders();
        } catch (err) {
          console.warn('加载文件夹失败，继续加载其他数据:', err);
        }
        
        try {
          await fetchNotes();
        } catch (err) {
          console.error('加载笔记失败:', err);
          setError(err instanceof Error ? err.message : '加载笔记时发生未知错误');
        }
        
        try {
          await fetchImages();
        } catch (err) {
          console.warn('加载图片失败:', err);
        }
      } catch (err) {
        console.error('加载数据错误:', err);
        setError(err instanceof Error ? err.message : '加载数据时发生未知错误');
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, [fetchNotes, fetchFolders, fetchImages]);
  
  // 提取所有唯一标签
  const getAllTags = useCallback(() => {
    const allTags: string[] = [];
    notes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
          if (!allTags.includes(tag)) {
            allTags.push(tag);
          }
        });
      }
    });
    return allTags.sort();
  }, [notes]);
  
  return {
    notes,
    folders,
    images,
    loading,
    error,
    fetchNotes,
    fetchFolders,
    fetchImages,
    saveNote,
    updateNote,
    deleteNote,
    createFolder,
    getAllTags,
    getFileUrl
  };
} 