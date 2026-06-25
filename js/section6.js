/* =======================================================
   섹션 6 (남겨진 유산) 전용 스크롤 애니메이션 로직
======================================================= */

// 1. 섹션 6 전용 스크롤 감지기 (Intersection Observer)
const sc6RevealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // 화면에 요소가 들어오면 'active' 클래스를 추가하여 애니메이션 실행
            entry.target.classList.add('active');
        } 
        // 💡 만약 스크롤을 올렸다가 다시 내릴 때마다 애니메이션을 반복하고 싶다면 
        // 아래 주석(//)을 해제하세요.
        // else {
        //     entry.target.classList.remove('active');
        // }
    });
}, { 
    threshold: 0.15, // 요소가 화면에 15% 이상 보일 때 작동
    rootMargin: "0px 0px -10% 0px" 
});

// 2. 문서 로드 완료 시 감지기 부착
document.addEventListener("DOMContentLoaded", () => {
    // HTML에서 'sc6-reveal' 클래스를 가진 모든 요소를 찾아 감지기에 등록
    const revealElements = document.querySelectorAll('.sc6-reveal');
    revealElements.forEach(el => sc6RevealObserver.observe(el));
});