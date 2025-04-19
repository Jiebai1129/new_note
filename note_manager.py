import os
import shutil
import datetime
import time
from pathlib import Path
import re

class NoteManager:
    def __init__(self, notes_path):
        """初始化笔记管理器
        
        Args:
            notes_path: 笔记文件夹的路径
        """
        self.notes_path = Path(notes_path)
        if not self.notes_path.exists():
            raise FileNotFoundError(f"笔记路径不存在: {notes_path}")
        
        # 缓存笔记列表
        self._notes_cache = None
        self._folders_cache = None
        self._images_cache = None
        self._last_refresh_time = 0
        
    def refresh(self):
        """刷新所有缓存的文件和文件夹列表"""
        self._notes_cache = None
        self._folders_cache = None
        self._images_cache = None
        self._last_refresh_time = time.time()
        return {
            'folders': len(self.get_all_folders()),
            'notes': len(self.get_all_notes()),
            'images': len(self.get_all_images())
        }
        
    def get_all_folders(self):
        """获取所有文件夹"""
        if self._folders_cache is None:
            folders = []
            for item in self.notes_path.iterdir():
                if item.is_dir() and not item.name.startswith('.'):
                    folders.append(item)
            self._folders_cache = folders
        return self._folders_cache
    
    def get_all_notes(self, extension='.md', force_refresh=False):
        """获取所有笔记文件
        
        Args:
            extension: 文件扩展名，默认为'.md'
            force_refresh: 是否强制刷新缓存
        
        Returns:
            笔记文件路径列表
        """
        if self._notes_cache is None or force_refresh:
            notes = []
            for file in self.notes_path.glob(f'**/*{extension}'):
                if not any(part.startswith('.') for part in file.parts):
                    notes.append(file)
            self._notes_cache = notes
        return self._notes_cache
    
    def get_all_images(self):
        """获取所有图片文件"""
        if self._images_cache is None:
            image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
            images = []
            for ext in image_extensions:
                for file in self.notes_path.glob(f'**/*{ext}'):
                    if not any(part.startswith('.') for part in file.parts):
                        images.append(file)
            self._images_cache = images
        return self._images_cache
    
    def read_note(self, note_path):
        """读取笔记内容
        
        Args:
            note_path: 笔记文件路径
        
        Returns:
            笔记内容文本
        """
        try:
            with open(note_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # 如果UTF-8解码失败，尝试使用其他编码
            try:
                with open(note_path, 'r', encoding='gbk') as f:
                    return f.read()
            except UnicodeDecodeError:
                return f"无法读取文件 {note_path}，编码不支持。"
    
    def save_note(self, title, content, folder=None):
        """保存新笔记
        
        Args:
            title: 笔记标题
            content: 笔记内容
            folder: 保存的子文件夹（可选）
        
        Returns:
            保存的文件路径
        """
        # 处理文件名，确保有.md扩展名
        if not title.endswith('.md'):
            filename = f"{title}.md"
        else:
            filename = title
        
        # 确定保存路径
        if folder:
            save_dir = self.notes_path / folder
            if not save_dir.exists():
                save_dir.mkdir(parents=True)
        else:
            save_dir = self.notes_path
        
        file_path = save_dir / filename
        
        # 保存文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 保存后刷新缓存
        self.refresh()
        
        return file_path
    
    def update_note(self, note_path, content):
        """更新现有笔记
        
        Args:
            note_path: 笔记文件路径
            content: 新的笔记内容
        
        Returns:
            成功则返回True，否则返回False
        """
        try:
            with open(note_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"更新笔记时发生错误: {e}")
            return False
    
    def extract_title_from_content(self, content):
        """从笔记内容中提取标题
        
        Args:
            content: 笔记内容
            
        Returns:
            提取到的标题，如果没有则返回None
        """
        # 尝试找到 # 开头的第一行作为标题
        match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if match:
            return match.group(1).strip()
        return None
    
    def extract_tags_from_content(self, content):
        """从笔记内容中提取标签
        
        Args:
            content: 笔记内容
            
        Returns:
            提取到的标签列表
        """
        # 查找 #tag 格式的标签
        tags = re.findall(r'#([a-zA-Z0-9_\u4e00-\u9fa5]+)', content)
        return list(set(tags))  # 去重
    
    def get_note_metadata(self, note_path, include_content=True):
        """获取笔记的元数据
        
        Args:
            note_path: 笔记文件路径
            include_content: 是否包含完整内容，默认为True
            
        Returns:
            包含笔记元数据的字典
        """
        try:
            content = self.read_note(note_path)
            title = self.extract_title_from_content(content) or note_path.stem
            tags = self.extract_tags_from_content(content)
            
            # 获取文件修改时间
            mtime = note_path.stat().st_mtime
            
            # 获取预览内容（去除标记后的前100个字符）
            preview = re.sub(r'#[a-zA-Z0-9_\u4e00-\u9fa5]+|#\s+.+\n|```[\s\S]*?```', '', content)
            preview = re.sub(r'\s+', ' ', preview).strip()
            preview = preview[:100] + ('...' if len(preview) > 100 else '')
            
            result = {
                'path': str(note_path),
                'relative_path': str(note_path.relative_to(self.notes_path)),
                'title': title,
                'tags': tags,
                'last_modified': mtime,
                'preview': preview,
            }
            
            # 只有当需要内容时才包含完整内容
            if include_content:
                result['content'] = content
                
            return result
        except Exception as e:
            print(f"获取笔记元数据时发生错误: {e}")
            result = {
                'path': str(note_path),
                'relative_path': str(note_path.relative_to(self.notes_path)),
                'title': note_path.stem,
                'tags': [],
                'last_modified': 0,
                'preview': "无法读取笔记内容",
            }
            
            if include_content:
                result['content'] = ""
                
            return result
    
    def get_all_notes_metadata(self, include_content=False):
        """获取所有笔记的元数据
        
        Args:
            include_content: 是否包含笔记完整内容，默认为False
        
        Returns:
            包含所有笔记元数据的列表
        """
        notes = self.get_all_notes()
        metadata_list = []
        
        for note in notes:
            metadata = self.get_note_metadata(note, include_content=include_content)
            metadata_list.append(metadata)
        
        # 按最后修改时间排序，最新的在前面
        metadata_list.sort(key=lambda x: x['last_modified'], reverse=True)
        
        return metadata_list
    
    def delete_note(self, note_path):
        """删除笔记
        
        Args:
            note_path: 笔记文件路径
            
        Returns:
            成功则返回True，否则返回False
        """
        try:
            Path(note_path).unlink()
            # 刷新缓存
            self.refresh()
            return True
        except Exception as e:
            print(f"删除笔记时发生错误: {e}")
            return False
    
    def list_all_contents(self):
        """列出所有内容，包括文件夹、笔记和图片"""
        print("文件夹:")
        for folder in self.get_all_folders():
            print(f"  - {folder.name}")
        
        print("\n笔记:")
        for note in self.get_all_notes():
            print(f"  - {note.relative_to(self.notes_path)}")
        
        print("\n图片:")
        for image in self.get_all_images():
            print(f"  - {image.relative_to(self.notes_path)}")

# 使用示例
if __name__ == "__main__":
    notes_dir = "/Users/jiebai/Documents/GitHub/note/数据库/docs"
    manager = NoteManager(notes_dir)
    
    # 列出所有内容
    manager.list_all_contents()
    
    # 获取所有笔记的元数据
    # metadata_list = manager.get_all_notes_metadata()
    # for metadata in metadata_list[:5]:  # 只打印前5个
    #     print(f"标题: {metadata['title']}")
    #     print(f"标签: {metadata['tags']}")
    #     print(f"预览: {metadata['preview']}")
    #     print("---") 