// 지도 앱으로 가는 링크. 둘 다 **공개된 웹 주소로 이동만** 하므로 API 키·계약이 필요 없고 요금도 없다.
// (지도를 우리 화면 안에 그리거나 좌표를 받아오는 것만 API 이용이다. 구장 검색은 카카오 로컬 API를 쓴다.)
// - 카카오맵 길찾기: https://map.kakao.com/link/to/이름,위도,경도 — 휴대폰에서 누르면 지금 위치에서 구장까지 경로가 잡힌다.
// - 네이버 지도: 검색 주소로 열고, 거기서 '길찾기'를 누른다. 네이버 웹 길찾기 주소는 좌표 형식이 공개돼 있지 않아 쓰지 않는다.
type Place={venue?:string;address?:string;lat?:number|null;lng?:number|null};
const clean=(v:unknown)=>String(v??"").replace(/,/g," ").trim();
export function kakaoRoute(p:Place){
 const name=clean(p.venue)||clean(p.address)||"경기장";
 if(p.lat!=null&&p.lng!=null&&Number.isFinite(p.lat)&&Number.isFinite(p.lng))return "https://map.kakao.com/link/to/"+encodeURIComponent(name)+","+p.lat+","+p.lng;
 return "https://map.kakao.com/link/search/"+encodeURIComponent(clean(p.address)||name);
}
export function naverSearch(p:Place){return "https://map.naver.com/p/search/"+encodeURIComponent(clean(p.address)||clean(p.venue))}
