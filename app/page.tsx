"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, ChevronDown, ChevronRight, File, Hash, Search, Folder, FolderPlus, X, Edit, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useNotes, ApiNote, ApiFolder, getFileUrl } from "@/hooks/useNotes"

// 定义笔记类型
// type Note = {
//   id: string
//   title: string
//   content: string
//   tags: string[]
//   notebookId: string
//   timestamp: string
//   preview?: string
//   lastUpdated: number
// }

// 定义标签类型
type Tag = {
  id: string
  name: string
}

// 定义笔记本类型
// type Notebook = {
//   id: string
//   name: string
// }

// 生成笔记预览
const generatePreview = (content: string, length = 60): string => {
  const plainText = content.replace(/#{1,6}\s/g, "").trim()
  return plainText.length > length ? plainText.substring(0, length) + "..." : plainText
}

// 更新时间戳
const updateTimestamp = (): string => {
  return "just now"
}

// 格式化日期
const formatDate = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp

  // 如果不到1分钟
  if (diff < 60 * 1000) {
    return "just now"
  }

  // 如果不到1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
  }

  // 如果不到24小时
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours} hour${hours > 1 ? "s" : ""} ago`
  }

  // 如果不到7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days} day${days > 1 ? "s" : ""} ago`
  }

  // 否则显示完整日期
  const date = new Date(timestamp)
  return date.toLocaleDateString()
}

// 自定义按钮组件
const CustomButton = ({
  children,
  onClick,
  variant = "default",
  className,
  ...props
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "outline" | "ghost" | "destructive"
  className?: string
  [key: string]: any
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full transition-colors"
  const variantStyles = {
    default: "bg-black text-white hover:bg-gray-800",
    outline: "border border-gray-300 hover:bg-gray-100",
    ghost: "hover:bg-gray-100",
    destructive: "text-red-500 hover:bg-red-50 hover:text-red-600",
  }

  return (
    <button onClick={onClick} className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {children}
    </button>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { notes, folders, loading, error, getAllTags, saveNote, createFolder, fetchNotes } = useNotes();

  // 所有可用标签
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [retrying, setRetrying] = useState(false)

  const [expandedSections, setExpandedSections] = useState({
    notebooks: true,
    tags: true,
  })

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<"tag" | "folder" | null>(null)

  // 更新标签列表
  useEffect(() => {
    if (notes.length > 0) {
      setAvailableTags(getAllTags());
    }
  }, [notes, getAllTags]);

  // 获取标签计数
  const getTagCounts = () => {
    const counts: Record<string, number> = {}
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        if (!counts[tag]) {
          counts[tag] = 0
        }
        counts[tag]++
      })
    })
    return counts
  }

  // 获取文件夹计数
  const getFolderCounts = () => {
    const counts: Record<string, number> = {}
    
    notes.forEach((note) => {
      const folderPath = note.relative_path.split('/')[0];
      if (folderPath && folderPath !== note.relative_path) {
        if (!counts[folderPath]) {
          counts[folderPath] = 0
        }
        counts[folderPath]++
      } else {
        if (!counts['根目录']) {
          counts['根目录'] = 0
        }
        counts['根目录']++
      }
    })
    
    return counts
  }

  // 创建新文件夹
  const handleCreateFolder = async () => {
    const folderName = prompt("请输入新文件夹名称:")
    if (folderName) {
      try {
        await createFolder(folderName);
        toast({
          title: "文件夹创建成功",
          description: `已创建文件夹 "${folderName}"`,
        })
      } catch (error) {
        toast({
          title: "创建文件夹失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        })
      }
    }
  }

  // 切换侧边栏部分展开/折叠
  const toggleSection = (section: "notebooks" | "tags") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // 创建新笔记
  const createNewNote = async () => {
    // 使用当前选中的文件夹 (如果有)
    let selectedFolder: string | undefined = undefined;
    if (filterType === "folder" && activeFilter) {
      selectedFolder = activeFilter === "根目录" ? undefined : activeFilter;
    }
    
    const defaultContent = "# 新笔记\n\n请在此处输入笔记内容..."
    
    try {
      const result = await saveNote("新笔记", defaultContent, selectedFolder);
      if (result && result.path) {
        // 提取相对路径用于导航
        const pathParts = result.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        toast({
          title: "笔记创建成功",
          description: `已创建新笔记`,
        })
        
        // 打开编辑页面
        router.push(`/edit?path=${encodeURIComponent(result.path)}`)
      }
    } catch (error) {
      toast({
        title: "创建笔记失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  // 设置过滤器 (按标签或文件夹)
  const setFilter = (type: "tag" | "folder", id: string) => {
    if (activeFilter === id && filterType === type) {
      // 如果点击当前激活的过滤器，则清除过滤器
      setActiveFilter(null)
      setFilterType(null)
    } else {
      // 否则设置新的过滤器
      setActiveFilter(id)
      setFilterType(type)
    }
  }

  // 清除过滤器
  const clearFilter = () => {
    setActiveFilter(null)
    setFilterType(null)
    setSearchQuery("")
  }

  // 打开笔记
  const openNote = (note: ApiNote) => {
    router.push(`/edit?path=${encodeURIComponent(note.path)}`)
  }

  // 过滤笔记
  const filteredNotes = notes.filter((note) => {
    // 先检查是否匹配搜索查询
    const matchesSearch = searchQuery === "" || 
                          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // 然后检查是否匹配标签过滤器
    if (filterType === "tag" && activeFilter) {
      return note.tags.includes(activeFilter);
    }
    
    // 检查是否匹配文件夹过滤器
    if (filterType === "folder" && activeFilter) {
      if (activeFilter === "根目录") {
        // 根目录的笔记不包含路径分隔符或是第一级文件
        return !note.relative_path.includes('/') || 
               note.relative_path.split('/').length === 1;
      } else {
        // 其他文件夹下的笔记路径以文件夹名开头
        return note.relative_path.startsWith(activeFilter + '/');
      }
    }
    
    return true;
  });

  // 重试加载数据
  const handleRetry = async () => {
    setRetrying(true)
    try {
      await fetchNotes()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="mx-auto flex h-screen bg-white dark:bg-gray-950">
      {/* 侧边栏 */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">我的笔记</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CustomButton
                  variant="outline"
                  className="px-2 py-1 h-8 w-8"
                  onClick={createNewNote}
                  disabled={loading || !!error}
                >
                  <PlusCircle size={16} />
                </CustomButton>
              </TooltipTrigger>
              <TooltipContent>创建新笔记</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="搜索笔记..."
            className="w-full pl-8 h-9 bg-gray-100 dark:bg-gray-800 border-0 rounded-md focus:ring-1 focus:ring-gray-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading || !!error}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 hover:text-gray-700"
              onClick={() => setSearchQuery("")}
              disabled={loading || !!error}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 笔记本列表 */}
        <div className="mb-4">
          <div
            className="flex items-center justify-between mb-2 cursor-pointer"
            onClick={() => toggleSection("notebooks")}
          >
            <div className="flex items-center gap-1 text-sm font-medium">
              {expandedSections.notebooks ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>文件夹</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCreateFolder()
                    }}
                    disabled={loading || !!error}
                  >
                    <FolderPlus size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>创建新文件夹</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {expandedSections.notebooks && (
            <div className="space-y-1 ml-6">
              <div
                className={cn(
                  "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 cursor-pointer text-gray-900",
                  activeFilter === "根目录" && filterType === "folder" 
                    ? "bg-gray-200 dark:bg-gray-800" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => setFilter("folder", "根目录")}
              >
                <Folder size={14} />
                <span>根目录</span>
                <span className="ml-auto text-xs text-gray-500">{getFolderCounts()["根目录"] || 0}</span>
              </div>
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  className={cn(
                    "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 cursor-pointer",
                    activeFilter === folder.name && filterType === "folder"
                      ? "bg-gray-200 dark:bg-gray-800"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setFilter("folder", folder.name)}
                >
                  <Folder size={14} />
                  <span>{folder.name}</span>
                  <span className="ml-auto text-xs text-gray-500">{getFolderCounts()[folder.name] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 标签列表 */}
        <div className="mb-4">
          <div
            className="flex items-center justify-between mb-2 cursor-pointer"
            onClick={() => toggleSection("tags")}
          >
            <div className="flex items-center gap-1 text-sm font-medium">
              {expandedSections.tags ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>标签</span>
            </div>
          </div>
          {expandedSections.tags && (
            <div className="space-y-1 ml-6">
              {availableTags.map((tag) => (
                <div
                  key={tag}
                  className={cn(
                    "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 cursor-pointer",
                    activeFilter === tag && filterType === "tag"
                      ? "bg-gray-200 dark:bg-gray-800"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setFilter("tag", tag)}
                >
                  <Hash size={14} />
                  <span>{tag}</span>
                  <span className="ml-auto text-xs text-gray-500">{getTagCounts()[tag] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <div className="text-gray-500">正在加载笔记...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-full text-red-500 space-y-4">
            <AlertCircle className="h-16 w-16" />
            <div className="text-xl font-semibold">加载笔记时出错</div>
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
          </div>
        ) : (
          <>
            {/* 标题栏 */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">
                  {activeFilter
                    ? filterType === "tag"
                      ? `标签: #${activeFilter}`
                      : `文件夹: ${activeFilter}`
                    : searchQuery
                    ? `搜索: "${searchQuery}"`
                    : "所有笔记"}
                </h2>
                {(activeFilter || searchQuery) && (
                  <button
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                    onClick={clearFilter}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <CustomButton
                variant="default"
                className="px-3 py-1.5 h-9 text-sm flex items-center gap-1"
                onClick={createNewNote}
              >
                <PlusCircle size={16} />
                <span>新笔记</span>
              </CustomButton>
            </div>

            {/* 笔记列表 */}
            {filteredNotes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">
                  {searchQuery || activeFilter ? "没有找到匹配的笔记" : "没有笔记"}
                </p>
                <CustomButton
                  variant="outline"
                  className="px-4 py-2 text-sm"
                  onClick={createNewNote}
                >
                  创建第一个笔记
                </CustomButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.path}
                    className="group border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer transition-all"
                    onClick={() => openNote(note)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium line-clamp-1">{note.title}</h3>
                      <button className="p-0.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit size={14} />
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {note.preview}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFilter("tag", tag)
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 2 && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                            +{note.tags.length - 2}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(note.last_modified * 1000)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      
      <Toaster />
    </div>
  )
}
