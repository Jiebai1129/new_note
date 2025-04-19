import os
import argparse
from pathlib import Path
from note_manager import NoteManager

def main():
    parser = argparse.ArgumentParser(description='笔记管理工具')
    parser.add_argument('--path', default='/Users/jiebai/Documents/GitHub/note/数据库/docs',
                        help='笔记文件夹路径，默认为: /Users/jiebai/Documents/GitHub/note/数据库/docs')
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # 列出所有内容
    list_parser = subparsers.add_parser('list', help='列出所有内容')
    list_parser.add_argument('--type', choices=['all', 'folders', 'notes', 'images'], 
                             default='all', help='列出的内容类型')
    list_parser.add_argument('--refresh', action='store_true', help='强制刷新缓存')
    
    # 读取笔记
    read_parser = subparsers.add_parser('read', help='读取笔记内容')
    read_parser.add_argument('note_path', help='笔记文件路径 (相对于笔记目录)')
    
    # 创建笔记
    create_parser = subparsers.add_parser('create', help='创建新笔记')
    create_parser.add_argument('title', help='笔记标题')
    create_parser.add_argument('--folder', help='保存的子文件夹 (可选)')
    create_parser.add_argument('--content', help='笔记内容 (可选，如未提供将打开编辑器)')
    create_parser.add_argument('--editor', action='store_true', help='使用编辑器创建笔记')
    
    # 刷新缓存
    refresh_parser = subparsers.add_parser('refresh', help='刷新笔记列表缓存')
    
    args = parser.parse_args()
    
    try:
        manager = NoteManager(args.path)
        
        if args.command == 'refresh':
            # 刷新缓存并显示结果
            result = manager.refresh()
            print(f"缓存已刷新！找到 {result['folders']} 个文件夹，{result['notes']} 个笔记和 {result['images']} 个图片。")
            
        elif args.command == 'list':
            # 如果指定了刷新，先刷新缓存
            if hasattr(args, 'refresh') and args.refresh:
                manager.refresh()
                
            if args.type == 'all':
                manager.list_all_contents()
            elif args.type == 'folders':
                folders = manager.get_all_folders()
                print("文件夹:")
                for folder in folders:
                    print(f"  - {folder.name}")
            elif args.type == 'notes':
                notes = manager.get_all_notes(force_refresh=args.refresh if hasattr(args, 'refresh') else False)
                print("笔记:")
                for note in notes:
                    print(f"  - {note.relative_to(args.path)}")
            elif args.type == 'images':
                images = manager.get_all_images()
                print("图片:")
                for image in images:
                    print(f"  - {image.relative_to(args.path)}")
        
        elif args.command == 'read':
            note_path = Path(args.path) / args.note_path
            if note_path.exists():
                content = manager.read_note(note_path)
                print("\n" + "="*50 + "\n")
                print(content)
                print("\n" + "="*50)
            else:
                print(f"错误: 笔记文件不存在: {note_path}")
        
        elif args.command == 'create':
            if args.editor:
                # 使用外部编辑器创建笔记
                import tempfile
                import subprocess
                
                # 创建一个临时文件
                with tempfile.NamedTemporaryFile(suffix='.md', delete=False) as tmp:
                    tmp_path = tmp.name
                    # 添加标题
                    tmp.write(f"# {args.title}\n\n".encode('utf-8'))
                
                # 使用默认编辑器打开临时文件
                editor = os.environ.get('EDITOR', 'vim')
                subprocess.call([editor, tmp_path])
                
                # 读取编辑后的内容
                with open(tmp_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 删除临时文件
                os.unlink(tmp_path)
                
                # 保存笔记
                note_path = manager.save_note(args.title, content, args.folder)
                print(f"笔记已保存: {note_path}")
            
            elif args.content:
                # 使用提供的内容创建笔记，将字符串中的 '\n' 转换为实际的换行符
                content = args.content.replace('\\n', '\n')
                note_path = manager.save_note(args.title, content, args.folder)
                print(f"笔记已保存: {note_path}")
                
                # 强制刷新缓存
                manager.refresh()
            
            else:
                # 如果没有提供内容也没有使用编辑器，使用简单的标题创建
                content = f"# {args.title}\n\n"
                note_path = manager.save_note(args.title, content, args.folder)
                print(f"笔记已创建: {note_path}")
                print("提示: 使用 '--editor' 参数可以在编辑器中编写笔记内容")
                
                # 强制刷新缓存
                manager.refresh()
        
        else:
            parser.print_help()
    
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    main() 