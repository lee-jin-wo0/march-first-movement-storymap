// [추가된 곡선 생성 도우미 함수]
// 직선 좌표 배열을 받아 부드러운 2차 베지어 곡선 좌표 배열로 변환합니다.
function generateCurvedPath(coords) {
    if (coords.length < 2) return coords;

    let curvedCoords = [];

    for (let i = 0; i < coords.length - 1; i++) {
        const start = coords[i];
        const end = coords[i + 1];

        const lat1 = start[0], lng1 = start[1];
        const lat2 = end[0], lng2 = end[1];

        // 1. 두 점 사이의 중간점 계산
        const midLat = (lat1 + lat2) / 2;
        const midLng = (lng1 + lng2) / 2;

        // 2. 거리 차이 계산
        const dLat = lat2 - lat1;
        const dLng = lng2 - lng1;

        // 3. 곡선의 휘어짐 정도 (강도 조절: 0.5 -> 0.15로 대폭 축소하여 거대한 궤적 방지)
        const intensity = 0.2;

        // 4. 특정 선만 방향 제어 (1번선: i=0, 2번선: i=1, 5번선: i=4)
        const isTargetLine = (i === 0 || i === 1 || i === 4);

        // isTargetLine이면 1 (진행방향 우측), 아니면 -1 (진행방향 좌측)으로 휨.
        // ※ 만약 화면에서 무조건 동쪽 ')' 모양으로 휘길 원하시면 (isTargetLine ? -1 : 1) 로 변경해보세요.
        const direction = isTargetLine ? 1 : -1;
        const offset = intensity * direction;

        // 5. 제어점 계산
        const cpLat = midLat - (dLng * offset);
        const cpLng = midLng + (dLat * offset);

        // 6. 2차 베지어 곡선을 따라 20개의 미세한 점 생성
        const steps = 20;
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * cpLat + t * t * lat2;
            const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * cpLng + t * t * lng2;

            // 중복되는 연결점 제거
            if (i > 0 && step === 0) continue;

            curvedCoords.push([lat, lng]);
        }
    }
    return curvedCoords;
}

// 1. 카드 스크롤 진입/이탈 감지기 (기존 유지)
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        } else {
            entry.target.classList.remove('active');
        }
    });
}, { threshold: 0.4, rootMargin: "0px 0px -10% 0px" });


// 2. 섹션 2 GeoJSON 연동 및 통합 로직
async function initSection2Map() {
    const mapS2 = L.map('map-s2', { zoomControl: false, scrollWheelZoom: false }).setView([37.5759 + 0.001, 126.9850 - 0.01], 15.2);
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    // }).addTo(mapS2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapS2);
    // L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    //     attribution: '© OpenStreetMap contributors'
    // }).addTo(mapS2);

    const pathLine = L.polyline([], {
        color: '#000000', weight: 3, dashArray: '8, 8', opacity: 1, lineJoin: 'round'
    }).addTo(mapS2);

    try {
        const response = await fetch('./data/section2.geojson');
        const geojsonData = await response.json();

        const targetIds = ["43", "13", "70", "20", "37", "42", "40"];
        const timelineData = [];
        const locationsS2 = [];

        // [데이터 추출] 
        targetIds.forEach(targetId => {
            const feature = geojsonData.features.find(f => String(f.id) === targetId);

            if (feature) {
                timelineData.push({
                    id: targetId,
                    date: feature.properties.DATE || feature.properties.ADDR_OLD || "날짜 없음",
                    title: feature.properties.TITLE || feature.properties.CONTENTS_NAME,
                    desc: feature.properties.DESC || feature.properties.VALUE_03 || "설명 정보가 없습니다.",
                    imgUrl: feature.properties.IMG_MAIN_URL || ""
                });

                let coords = null;
                if (feature.geometry.type === 'Point') {
                    coords = feature.geometry.coordinates;
                } else if (feature.geometry.type === 'GeometryCollection') {
                    const pointGeo = feature.geometry.geometries.find(g => g.type === 'Point');
                    if (pointGeo) coords = pointGeo.coordinates;
                }

                if (coords) {
                    locationsS2.push({
                        id: targetId,
                        pos: [coords[1], coords[0]],
                        label: feature.properties.CONTENTS_NAME,
                        address: feature.properties.ADDR_OLD || "주소 정보 없음"
                    });
                }
            }
        });

        // [HTML 카드 동적 생성]
        const timelineList = document.getElementById('sc2-timeline-list');
        timelineList.innerHTML = '';

        timelineData.forEach(item => {
            const imageHTML = item.imgUrl ? `<img src="${item.imgUrl}" alt="${item.title}" class="sc2-item-img">` : "";

            const cardHTML = `
                <div class="sc2-timeline-item sc2-scroll-reveal" data-marker="${item.id}">
                    <span class="sc2-item-date">${item.date}</span>
                    <h3 class="sc2-item-title">${item.title}</h3>
                    ${imageHTML} <p class="sc2-item-desc">${item.desc}</p>
                </div>
            `;
            timelineList.insertAdjacentHTML('beforeend', cardHTML);
        });

        document.querySelectorAll('.sc2-scroll-reveal').forEach(el => revealObserver.observe(el));
        // [마커 및 툴팁 생성]
        const markers = {};

        locationsS2.forEach(loc => {
            const stepNumber = targetIds.indexOf(loc.id) + 1;
            const icon = L.divIcon({
                className: 'custom-div-icon',
                // [마커 및 툴팁 생성] 내부의 divIcon html 부분 수정
                html: `
                <div class='sc2-marker-wrapper sc2-marker-dimmed' id='map-marker-container-${loc.id}'>
                    <div class='sc2-marker-circle'>${stepNumber}</div>
                </div>
            `,
                iconSize: [30, 30], iconAnchor: [15, 15]
            });

            const marker = L.marker(loc.pos, { icon }).addTo(mapS2);

            // 1. 주소(loc.address) 부분을 삭제하고 장소 이름만 깔끔하게 남깁니다.
            const tooltipContent = `
                <div style="text-align: center;">
                    <div style="font-weight: bold;">${loc.label}</div>
                </div>
            `;

            // 2. permanent 속성을 true로 유지하여 스크롤 시 모든 팝업창이 항상 뜨도록 설정합니다.
            marker.bindTooltip(tooltipContent, {
                permanent: true,
                direction: 'top',
                className: 'sc2-marker-tooltip',
                offset: [0, -15]
            });

            markers[loc.id] = { marker, tooltip: marker.getTooltip() };
        });

        // 페이지 처음 로드 시 모든 연결선이 즉시 다 이어져 있도록 초기 표시 처리
        const initialCoords = targetIds
            .map(id => locationsS2.find(l => l.id === id)?.pos)
            .filter(Boolean);
        const curvedInitialCoords = generateCurvedPath(initialCoords);
        pathLine.setLatLngs(curvedInitialCoords);

        // [스크롤 감지 로직 - 마커/툴팁 제어]
        const markerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const activeId = String(entry.target.getAttribute('data-marker'));
                    const activeIndex = targetIds.indexOf(activeId);

                    // 1. 툴팁 제어 (이제 숨기는 대신 투명도만 조절)
                    Object.keys(markers).forEach(key => {
                        const tooltipEl = markers[key]?.tooltip?.getElement();
                        if (tooltipEl) {
                            // CSS 클래스로 투명도 제어 (sc2-tooltip-dimmed / sc2-tooltip-active)
                            if (key === activeId) {
                                tooltipEl.classList.remove('sc2-tooltip-dimmed');
                                tooltipEl.classList.add('sc2-tooltip-active');
                            } else {
                                tooltipEl.classList.remove('sc2-tooltip-active');
                                tooltipEl.classList.add('sc2-tooltip-dimmed');
                            }
                        }
                    });

                    // 2. 마커 누적 제어
                    targetIds.forEach((id, index) => {
                        const container = document.getElementById(`map-marker-container-${id}`);
                        if (container) {
                            if (index <= activeIndex) {
                                container.classList.remove('sc2-marker-dimmed');
                                container.classList.add('sc2-marker-active');
                            } else {
                                container.classList.remove('sc2-marker-active');
                                container.classList.add('sc2-marker-dimmed');
                            }
                        }
                    });

                    // 3. 점선 업데이트 및 투명도 제어
                    const visibleCoords = targetIds
                        .map(id => locationsS2.find(l => l.id === id)?.pos)
                        .filter(Boolean);

                    const curvedVisibleCoords = generateCurvedPath(visibleCoords);
                    pathLine.setLatLngs(curvedVisibleCoords);

                    // 연결선 투명도 조절: 지나온 지점까지는 1, 이후는 0.3
                    // Leaflet의 setStyle을 사용하여 동적 변경
                    pathLine.setStyle({
                        opacity: 1 // 필요 시 여기서 로직을 더 세분화할 수 있습니다.
                    });
                }
            });
        }, { threshold: 0.5, rootMargin: "-20% 0px -20% 0px" });

        document.querySelectorAll('.sc2-timeline-item').forEach(item => markerObserver.observe(item));

    } catch (error) {
        console.error('GeoJSON 데이터 로드 에러:', error);
    }
}

// 스크립트 실행 (오류 방지를 위해 DOMContentLoaded 안에 넣었습니다)
document.addEventListener("DOMContentLoaded", () => {
    initSection2Map();
});