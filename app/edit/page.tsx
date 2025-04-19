"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Save, Trash, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'

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

export default function EditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const notePath = searchParams.get('path')
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  
  // 加载笔记内容
  const fetchNote = async () => {
    if (!notePath) {
      setError('未指定笔记路径')
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const response = await fetchWithRetry(`/api/notes`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`获取笔记失败: ${errorDetail}`);
      }
      
      const notes = await response.json()
      const note = notes.find((n: any) => n.path === notePath)
      
      if (!note) {
        throw new Error('找不到指定的笔记')
      }
      
      setTitle(note.title)
      setContent(note.content)
      setError(null)
    } catch (err) {
      console.error('获取笔记错误:', err)
      setError(err instanceof Error ? err.message : '加载笔记时发生未知错误')
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }
  
  // 初始加载
  useEffect(() => {
    fetchNote()
  }, [notePath])
  
  // 重试加载
  const handleRetry = () => {
    setRetrying(true)
    fetchNote()
  }
  
  // 保存笔记
  const handleSave = async () => {
    if (!notePath) return
    
    try {
      setSaving(true)
      const response = await fetchWithRetry('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: notePath,
          content,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`保存笔记失败: ${errorDetail}`);
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: '笔记已保存',
          description: '您的更改已成功保存。',
        })
      } else {
        throw new Error(result.error || '保存笔记失败')
      }
    } catch (err) {
      console.error('保存笔记错误:', err)
      toast({
        title: '保存失败',
        description: err instanceof Error ? err.message : '保存笔记时发生未知错误',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }
  
  // 删除笔记
  const handleDelete = async () => {
    if (!notePath) return
    
    if (!confirm('确定要删除这个笔记吗？此操作不可撤销。')) {
      return
    }
    
    try {
      const response = await fetchWithRetry('/api/notes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: notePath,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorDetail = errorData?.details || errorData?.error || response.statusText;
        throw new Error(`删除笔记失败: ${errorDetail}`);
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: '笔记已删除',
          description: '笔记已成功删除。',
        })
        
        // 返回到笔记列表页
        router.push('/')
      } else {
        throw new Error(result.error || '删除笔记失败')
      }
    } catch (err) {
      console.error('删除笔记错误:', err)
      toast({
        title: '删除失败',
        description: err instanceof Error ? err.message : '删除笔记时发生未知错误',
        variant: 'destructive',
      })
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* 头部工具栏 */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <button 
            onClick={() => router.push('/')} 
            className="flex items-center text-gray-600 hover:text-gray-900 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>返回</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || loading || !!error}
              className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>保存</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleDelete}
              disabled={loading || !!error}
              className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:text-red-600 rounded-full text-sm"
            >
              <Trash className="h-4 w-4" />
              <span>删除</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* 主编辑区 */}
      <main className="flex-1 container mx-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-red-500 space-y-4">
            <AlertCircle className="h-12 w-12" />
            <div className="text-xl font-semibold">出错了</div>
            <div className="text-center max-w-md">{error}</div>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-full mt-4 hover:bg-gray-700"
            >
              {retrying ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>重试</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900 mt-2"
            >
              返回笔记列表
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 编辑区 */}
            <div className="col-span-1">
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[calc(100vh-160px)] p-4 border rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white dark:bg-gray-900 font-mono text-sm resize-none"
                placeholder="在此输入Markdown内容..."
              />
            </div>
            
            {/* 预览区 */}
            <div className="col-span-1 h-[calc(100vh-160px)] overflow-auto border rounded-md p-4 prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            </div>
          </div>
        )}
      </main>
      
      <Toaster />
    </div>
  )
}

// 简单的Markdown渲染函数
function renderMarkdown(text: string): string {
  // 这只是一个非常简单的Markdown到HTML的转换
  // 在实际项目中，建议使用成熟的Markdown库如marked或markdown-it
  
  let html = text
    // 处理标题
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    
    // 处理加粗和斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // 处理链接
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    
    // 处理图片
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />')
    
    // 处理代码块
    .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')
    
    // 处理行内代码
    .replace(/`(.+?)`/g, '<code>$1</code>')
    
    // 处理列表
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^[0-9]+\. (.+)$/gm, '<li>$1</li>')
    
    // 处理引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    
    // 处理水平线
    .replace(/^---$/gm, '<hr>')
    
    // 处理段落 (最后处理，以避免影响其他转换)
    .replace(/^(?!<[a-z]).+$/gm, '<p>$&</p>')
    
    // 处理换行
    .replace(/\n\n/g, '<br>')
  
  return html
}