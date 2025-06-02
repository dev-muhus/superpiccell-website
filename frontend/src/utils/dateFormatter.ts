/**
 * 日付を絶対形式または相対形式でフォーマットする
 * 
 * @param dateString フォーマットする日付文字列
 * @param showAbsoluteTime 絶対時間表示にするかどうか
 * @param forceAbsolute 強制的に絶対時間表示にするかどうか
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (
  dateString: string, 
  showAbsoluteTime: boolean = false, 
  forceAbsolute = false
): string => {
  try {
    const date = new Date(dateString);
    
    // 絶対時間表示が強制されているか、状態で絶対時間表示が選択されている場合
    if (forceAbsolute || showAbsoluteTime) {
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/\//g, '-');
    }
    
    // 相対時間表示
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // 24時間以内
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      if (hours < 1) {
        const minutes = Math.floor(diff / (60 * 1000));
        return minutes <= 0 ? 'たった今' : `${minutes}分前`;
      }
      return `${hours}時間前`;
    }
    
    // 日付表示
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  } catch (e) {
    console.error('日付のフォーマットエラー:', e);
    return dateString;
  }
}; 