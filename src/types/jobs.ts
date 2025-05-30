/**
 * 채용정보 데이터 구조
 * 스크래퍼로 수집한 채용 공고의 정보를 담는 인터페이스
 */
export interface JobInfo {
  /**
   * 채용 공고를 올린 회사명
   * 예: "삼성전자", "네이버", "카카오"
   */
  companyName: string;
  
  /**
   * 채용 공고의 제목
   * 예: "2023년 상반기 경력 백엔드 개발자 모집"
   */
  jobTitle: string;
  
  /**
   * 근무 위치 또는 주소
   * 예: "서울시 강남구", "경기도 성남시 분당구"
   */
  jobLocation: string;
  
  /**
   * 요구되는 경력 수준
   * 예: "신입", "경력", "경력무관", "3년 이상"
   */
  jobType: string;
  
  /**
   * 급여 정보
   * 예: "연봉 5,000만원 이상", "면접 후 결정", "회사 내규에 따름"
   */
  jobSalary: string;
  
  /**
   * 지원 마감 기한
   * 예: "2023-12-31", "2023-12-31 18:00", "상시채용"
   */
  deadline: string;
  
  /**
   * 원본 채용공고 URL
   * 스크랩 결과 확인이나 추가 정보 수집에 활용
   */
  url?: string;
  
  /**
   * 채용정보 스크랩 시점
   * 데이터 수집 시간을 기록하여 정보의 신선도 파악에 활용
   */
  scrapedAt?: string;
}

/**
 * 스크래퍼 설정 옵션
 * 스크래핑 동작을 세밀하게 제어하기 위한 설정 인터페이스
 */
export interface ScraperConfig {
  /**
   * 스크랩을 시작할 페이지 번호
   * 기본값은 보통 1 또는 2를 사용 (서비스에 따라 다름)
   */
  startPage?: number;
  
  /**
   * 스크랩을 종료할 페이지 번호
   * 너무 많은 페이지를 스크랩하면 IP 차단 위험이 있음
   */
  endPage?: number;
  
  /**
   * 브라우저 UI 표시 여부
   * true: 브라우저 화면 없이 실행 (서버 환경에 적합)
   * false: 브라우저 화면 표시 (디버깅에 유용)
   */
  headless?: boolean;
  
  /**
   * 페이지 로딩 사이의 대기 시간(밀리초)
   * 너무 짧게 설정하면 서버에서 봇으로 인식될 수 있음
   */
  waitTime?: number;
}
