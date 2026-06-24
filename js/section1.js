/* =======================================================
   섹션 1: 4개의 개별 지도 초기화
======================================================= */
function initSection1Maps() {
    const mapConfigsS1 = [
        { id: 'map-s1-1', center: [37.5562, 126.9850], zoom: 15, title: '남산 통감관저 터 (한일병합조약)' },
        { id: 'map-s1-2', center: [37.5658, 126.9751], zoom: 16, title: '덕수궁 함녕전 (고종 승하)' },
        { id: 'map-s1-3', center: [48.8566, 2.3522], zoom: 5, title: '프랑스 파리 (파리강화회의)' },
        { id: 'map-s1-4', center: [35.6989, 139.7544], zoom: 15, title: '도쿄 YMCA (2·8 독립선언지)' }
    ];

    mapConfigsS1.forEach(config => {
        const mapElement = document.getElementById(config.id);
        if (!mapElement) return;

        const map = L.map(config.id, {
            center: config.center,
            zoom: config.zoom,
            zoomControl: false,
            scrollWheelZoom: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        const icon = L.divIcon({
            className: 'custom-marker-wrapper',
            html: '<div class="map-pulse"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        L.marker(config.center, { icon: icon })
            .addTo(map)
            .bindTooltip(config.title, {
                permanent: true,
                direction: 'top',
                offset: [0, -15],
                className: 'custom-tooltip'
            }).openTooltip();
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active', 'visible');
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

    document.querySelectorAll('.sc1-reveal').forEach(el => revealObserver.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
    initSection1Maps();
});