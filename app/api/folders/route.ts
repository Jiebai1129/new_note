import { exec } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import util from 'util';

// 将exec转为Promise版本
const execPromise = util.promisify(exec);

// 设置笔记文件夹路径
const NOTES_PATH = '/Users/jiebai/Documents/GitHub/note/数据库/docs';

// 获取所有文件夹
export async function GET(req: NextRequest) {
  try {
    console.log('正在获取文件夹列表，笔记路径:', NOTES_PATH);
    const pythonScript = path.join(process.cwd(), 'get_folders.py');
    
    // 确保note_manager.py在当前目录下存在
    const managerPath = path.join(process.cwd(), 'note_manager.py');
    if (!fs.existsSync(managerPath)) {
      console.error('找不到note_manager.py文件:', managerPath);
      return NextResponse.json({ error: '找不到note_manager.py模块' }, { status: 500 });
    }
    
    // 使用临时的Python脚本获取文件夹
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
    folders = manager.get_all_folders()
    folder_list = []
    
    for folder in folders:
        folder_list.append({
            'name': folder.name,
            'path': str(folder),
            'relative_path': str(folder.relative_to("${NOTES_PATH}"))
        })
    
    print(json.dumps(folder_list))
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
      console.error('获取文件夹列表错误:', stderr);
      return NextResponse.json({ error: '获取文件夹列表失败', details: stderr }, { status: 500 });
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
      const folders = JSON.parse(jsonStr);
      return NextResponse.json(folders);
    } catch (e) {
      console.error('解析文件夹列表JSON失败:', e);
      console.error('原始输出:', stdout);
      return NextResponse.json({ 
        error: '解析文件夹列表JSON失败', 
        details: e instanceof Error ? e.message : '未知错误',
        output: stdout 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('获取文件夹列表异常:', error);
    return NextResponse.json({ 
      error: '获取文件夹列表失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 });
  }
}

// 创建新文件夹
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { folderName } = data;
    
    if (!folderName) {
      return NextResponse.json({ error: '缺少文件夹名称' }, { status: 400 });
    }
    
    // 创建新文件夹
    const newFolderPath = path.join(NOTES_PATH, folderName);
    console.log('正在创建新文件夹:', newFolderPath);
    
    try {
      if (!fs.existsSync(newFolderPath)) {
        fs.mkdirSync(newFolderPath, { recursive: true });
        console.log('文件夹创建成功');
      } else {
        console.log('文件夹已存在');
      }
      
      return NextResponse.json({ 
        success: true, 
        path: newFolderPath,
        name: folderName
      });
    } catch (e) {
      console.error('创建文件夹失败:', e);
      return NextResponse.json({ 
        error: '创建文件夹失败', 
        details: e instanceof Error ? e.message : '未知错误' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('创建文件夹请求处理失败:', error);
    return NextResponse.json({ 
      error: '创建文件夹失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 });
  }
} 