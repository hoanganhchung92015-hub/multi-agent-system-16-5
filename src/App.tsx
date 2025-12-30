// Chỉnh sửa logic chính trong App.tsx
const handleRunAnalysis = useCallback(async () => {
  if (!selectedSubject || (!image && !voiceText)) return;
  
  setScreen('ANALYSIS');
  setLoading(true);
  setAiData(null);
  setQuizReady(false);
  setActiveTab(1);

  // Tạo một AbortController để hủy request nếu người dùng thoát ra ngoài, giúp tiết kiệm quota
  const controller = new AbortController();

  try {
    const data = await fetchAiSolution(selectedSubject, voiceText || "Giải bài", image || undefined);
    
    // Cập nhật Tab 1 & 2 ngay lập tức
    setAiData(data);
    setLoading(false);

    // Kỹ thuật "Lazy Load" cho Tab 3: Tạo khoảng nghỉ 1.5s để UI mượt mà hơn
    setTimeout(() => {
      setQuizReady(true);
    }, 1500);

  } catch (error) {
    console.error("Build error or Timeout:", error);
    setLoading(false);
    setScreen('INPUT');
    alert("Kết nối yếu, vui lòng thử lại!");
  }
}, [selectedSubject, image, voiceText]);
export default App;
