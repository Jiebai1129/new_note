import { exec } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import util from 'util';

// 将exec转为Promise版本
const execPromise = util.promisify(exec);

// 设置笔记文件夹路径
const NOTES_PATH = '/Users/jiebai/Documents/GitHub/note/数据库/docs';

// 获取所有图片
export async function GET(req: NextRequest) {
  try {
    console.log('正在获取图片列表，笔记路径:', NOTES_PATH);
    const pythonScript = path.join(process.cwd(), 'get_images.py');
    
    // 确保note_manager.py在当前目录下存在
    const managerPath = path.join(process.cwd(), 'note_manager.py');
    if (!fs.existsSync(managerPath)) {
      console.error('找不到note_manager.py文件:', managerPath);
      return NextResponse.json({ error: '找不到note_manager.py模块' }, { status: 500 });
    }
    
    // 使用临时的Python脚本获取图片
    const tempScript = `
import sys
import json
import os

print("当前工作目录:", os.getcwd())
print("正在加载笔记管理器模块...")

try:
    sys.path.append("${process.cwd()}")
    from note_manager import NoteManager
    
    print("笔记路径:", "${NOTES_PATH}")
    manager = NoteManager("${NOTES_PATH}")
    images = manager.get_all_images()
    image_list = []
    
    for image in images:
        image_list.append({
            'name': image.name,
            'path': str(image),
            'relative_path': str(image.relative_to("${NOTES_PATH}")),
            'size': image.stat().st_size,
            'last_modified': image.stat().st_mtime
        })
    
    print(json.dumps(image_list))
except Exception as e:
    import traceback
    print("发生错误:")
    print(traceback.format_exc())
    sys.exit(1)
`;
    
    // 写入临时文件
    fs.writeFileSync(pythonScript, tempScript);
    console.log('已创建临时Python脚本:', pythonScript);
    
    // 执行脚本
    console.log('正在执行脚本...');
    const { stdout, stderr } = await execPromise(`python3 ${pythonScript}`);
    
    // 删除临时文件
    fs.unlinkSync(pythonScript);
    console.log('临时脚本已删除');
    
    if (stderr && !stderr.includes('WARNING:')) {
      console.error('获取图片列表错误:', stderr);
      return NextResponse.json({ error: '获取图片列表失败', details: stderr }, { status: 500 });
    }
    
    try {
      // 检查输出是否包含JSON数据
      const jsonStartIndex = stdout.indexOf('[');
      if (jsonStartIndex === -1) {
        console.error('脚本输出不包含JSON数据:', stdout);
        return NextResponse.json({ 
          error: '脚本输出格式不正确', 
          output: stdout 
        }, { status: 500 });
      }
      
      const jsonStr = stdout.substring(jsonStartIndex);
      const images = JSON.parse(jsonStr);
      return NextResponse.json(images);
    } catch (e) {
      console.error('解析图片列表JSON失败:', e);
      console.error('原始输出:', stdout);
      return NextResponse.json({ 
        error: '解析图片列表JSON失败', 
        details: e instanceof Error ? e.message : '未知错误',
        output: stdout 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('获取图片列表异常:', error);
    return NextResponse.json({ 
      error: '获取图片列表失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 });
  }
} 