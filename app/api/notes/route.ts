import { exec } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import util from 'util';

// 将exec转为Promise版本，增加最大缓冲区大小
const execPromise = util.promisify(exec);

// 设置笔记文件夹路径
const NOTES_PATH = '/Users/jiebai/Documents/GitHub/note/数据库/docs';

// 辅助函数：执行Python脚本，增加maxBuffer参数
async function runPythonScript(args: string) {
  try {
    // 增加maxBuffer大小到50MB，默认值只有1MB
    const { stdout, stderr } = await execPromise(`python3 /Users/jiebai/Documents/GitHub/note/new_note/note_cli.py ${args}`, { maxBuffer: 50 * 1024 * 1024 });
    if (stderr && !stderr.includes('WARNING:')) {
      console.error('脚本错误:', stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error('执行脚本失败:', error);
    throw error;
  }
}

// 获取所有笔记
export async function GET(req: NextRequest) {
  try {
    // 使用Python脚本获取笔记列表及元数据，以JSON格式返回
    const pythonScript = path.join(process.cwd(), 'get_notes_metadata.py');
    
    console.log('正在获取笔记列表，工作目录:', process.cwd());
    console.log('笔记路径:', NOTES_PATH);
    
    try {
      // 确保note_manager.py在当前目录下存在
      const managerPath = path.join(process.cwd(), 'note_manager.py');
      if (!fs.existsSync(managerPath)) {
        console.error('找不到note_manager.py文件:', managerPath);
        return NextResponse.json({ error: '找不到note_manager.py模块' }, { status: 500 });
      }
      
      // 使用临时的Python脚本获取完整的笔记元数据
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
    # 默认不包含完整内容，可以减少输出数据量
    metadata_list = manager.get_all_notes_metadata(include_content=False)
    print(json.dumps(metadata_list))
except Exception as e:
    import traceback
    print("发生错误:")
    print(traceback.format_exc())
    sys.exit(1)
`;
      
      // 写入临时文件
      fs.writeFileSync(pythonScript, tempScript);
      console.log('已创建临时Python脚本:', pythonScript);
      
      // 执行脚本 - 增加maxBuffer大小到50MB
      console.log('正在执行脚本...');
      const { stdout, stderr } = await execPromise(`python3 ${pythonScript}`, { maxBuffer: 50 * 1024 * 1024 });
      
      // 删除临时文件
      fs.unlinkSync(pythonScript);
      console.log('临时脚本已删除');
      
      if (stderr && !stderr.includes('WARNING:')) {
        console.error('获取笔记列表错误:', stderr);
        return NextResponse.json({ error: '获取笔记列表失败', details: stderr }, { status: 500 });
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
        const notes = JSON.parse(jsonStr);
        return NextResponse.json(notes);
      } catch (e) {
        console.error('解析笔记列表JSON失败:', e);
        console.error('原始输出:', stdout);
        return NextResponse.json({ 
          error: '解析笔记列表失败', 
          details: e instanceof Error ? e.message : '未知错误',
          output: stdout 
        }, { status: 500 });
      }
    } catch (err) {
      console.error('执行Python脚本错误:', err);
      return NextResponse.json({ 
        error: '执行Python脚本失败', 
        details: err instanceof Error ? err.message : '未知错误' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('获取笔记列表异常:', error);
    return NextResponse.json({ 
      error: '获取笔记列表失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 });
  }
}

// 创建或更新笔记
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, content, folder, path: notePath } = data;
    
    let result;
    
    // 如果提供了notePath，则更新现有笔记
    if (notePath) {
      console.log('正在更新笔记:', notePath);
      try {
        // 写入临时的Python脚本用于更新笔记
        const updateScript = path.join(process.cwd(), 'update_note.py');
        const tempUpdateScript = `
import sys
import os

try:
    sys.path.append("${process.cwd()}")
    from note_manager import NoteManager
    
    manager = NoteManager("${NOTES_PATH}")
    success = manager.update_note("${notePath}", """${content.replace(/"""/g, '\\"\\"\\"')}""")
    print("success" if success else "failed")
except Exception as e:
    import traceback
    print("错误:")
    print(traceback.format_exc())
    print("failed")
`;
        
        fs.writeFileSync(updateScript, tempUpdateScript);
        
        // 执行脚本 - 增加maxBuffer参数
        const { stdout, stderr } = await execPromise(`python3 ${updateScript}`, { maxBuffer: 50 * 1024 * 1024 });
        
        // 删除临时文件
        fs.unlinkSync(updateScript);
        
        if (stderr && !stderr.includes('WARNING:')) {
          console.error('更新笔记错误:', stderr);
          return NextResponse.json({ error: '更新笔记失败', details: stderr }, { status: 500 });
        }
        
        result = { success: stdout.includes('success'), path: notePath };
      } catch (err) {
        console.error('执行更新脚本错误:', err);
        return NextResponse.json({ 
          error: '执行更新脚本失败', 
          details: err instanceof Error ? err.message : '未知错误' 
        }, { status: 500 });
      }
    } else {
      // 创建新笔记
      console.log('正在创建新笔记:', title, folder ? `在文件夹"${folder}"中` : '在根目录');
      try {
        const createScript = path.join(process.cwd(), 'create_note.py');
        const tempCreateScript = `
import sys
import os

try:
    sys.path.append("${process.cwd()}")
    from note_manager import NoteManager
    
    manager = NoteManager("${NOTES_PATH}")
    folder_path = ${folder ? `"${folder}"` : 'None'}
    note_path = manager.save_note("${title}", """${content.replace(/"""/g, '\\"\\"\\"')}""", folder_path)
    print(f"笔记已保存: {note_path}")
except Exception as e:
    import traceback
    print("错误:")
    print(traceback.format_exc())
    sys.exit(1)
`;
        
        fs.writeFileSync(createScript, tempCreateScript);
        
        // 执行脚本 - 增加maxBuffer参数
        const { stdout, stderr } = await execPromise(`python3 ${createScript}`, { maxBuffer: 50 * 1024 * 1024 });
        
        // 删除临时文件
        fs.unlinkSync(createScript);
        
        if (stderr && !stderr.includes('WARNING:')) {
          console.error('创建笔记错误:', stderr);
          return NextResponse.json({ error: '创建笔记失败', details: stderr }, { status: 500 });
        }
        
        // 解析输出以获取新笔记的路径
        const match = stdout.match(/笔记已保存: (.+)$/m);
        const newNotePath = match ? match[1] : null;
        
        result = { success: !!newNotePath, path: newNotePath };
      } catch (err) {
        console.error('执行创建脚本错误:', err);
        return NextResponse.json({ 
          error: '执行创建脚本失败', 
          details: err instanceof Error ? err.message : '未知错误' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('保存笔记失败:', error);
    return NextResponse.json({ 
      error: '保存笔记失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 });
  }
}

// 删除笔记
export async function DELETE(req: NextRequest) {
  try {
    const data = await req.json();
    const { path: notePath } = data;
    
    if (!notePath) {
      return NextResponse.json({ error: '缺少笔记路径' }, { status: 400 });
    }
    
    console.log('正在删除笔记:', notePath);
    try {
      // 写入临时的Python脚本用于删除笔记
      const deleteScript = path.join(process.cwd(), 'delete_note.py');
      const tempDeleteScript = `
import sys
import os

try:
    sys.path.append("${process.cwd()}")
    from note_manager import NoteManager
    
    manager = NoteManager("${NOTES_PATH}")
    success = manager.delete_note("${notePath}")
    print("success" if success else "failed")
except Exception as e:
    import traceback
    print("错误:")
    print(traceback.format_exc())
    print("failed")
`;
      
      fs.writeFileSync(deleteScript, tempDeleteScript);
      
      // 执行脚本 - 增加maxBuffer参数
      const { stdout, stderr } = await execPromise(`python3 ${deleteScript}`, { maxBuffer: 50 * 1024 * 1024 });
      
      // 删除临时文件
      fs.unlinkSync(deleteScript);
      
      if (stderr && !stderr.includes('WARNING:')) {
        console.error('删除笔记错误:', stderr);
        return NextResponse.json({ error: '删除笔记失败', details: stderr }, { status: 500 });
      }
      
      const result = { success: stdout.includes('success') };
      return NextResponse.json(result);
    } catch (err) {
      console.error('执行删除脚本错误:', err);
      return NextResponse.json({ 
        error: '执行删除脚本失败', 
        details: err instanceof Error ? err.message : '未知错误' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('删除笔记请求处理失败:', error);
    return NextResponse.json({ 
      error: '删除笔记失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 });
  }
} 