import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';

// 设置笔记文件夹路径
const NOTES_PATH = '/Users/jiebai/Documents/GitHub/note/数据库/docs';

// 获取适当的MIME类型
function getMimeType(filePath: string) {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  const mimeTypes: { [key: string]: string } = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'json': 'application/json',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 从路径参数中构建文件路径
    const filePath = join(NOTES_PATH, ...params.path);
    console.log('请求访问文件:', filePath);
    
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      return new NextResponse('文件不存在', { status: 404 });
    }
    
    // 检查是否是文件而不是目录
    try {
      const stats = statSync(filePath);
      if (!stats.isFile()) {
        console.error('路径不是文件:', filePath);
        return new NextResponse('路径不是文件', { status: 400 });
      }
      
      // 打印文件信息
      console.log(`文件大小: ${stats.size} 字节, 修改时间: ${new Date(stats.mtime).toLocaleString()}`);
    } catch (error) {
      console.error('获取文件信息失败:', error);
      return new NextResponse('获取文件信息失败', { status: 500 });
    }
    
    // 读取文件
    try {
      const fileBuffer = readFileSync(filePath);
      
      // 确定MIME类型
      const contentType = getMimeType(filePath);
      console.log('文件类型:', contentType);
      
      // 返回文件内容
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // 缓存1天
        },
      });
    } catch (error) {
      console.error('读取文件内容失败:', error);
      return new NextResponse('读取文件内容失败', { status: 500 });
    }
  } catch (error) {
    console.error('处理文件请求失败:', error);
    return new NextResponse('处理文件请求失败', { status: 500 });
  }
} 