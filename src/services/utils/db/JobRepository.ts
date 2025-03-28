import sequelize from "sequelize";
import { LoggerService } from "../logging/LoggerService";
import { JobInfo } from "../types/JobTypes";
import CompanyRecruitmentTable from "../../../models/main/CompanyRecruitmentTable";
import { JobMatchResult } from "../ai/JobMatchingService";

/**
 * 채용 정보 저장소 - 데이터베이스 작업 처리
 */
export class JobRepository {
  private logger: LoggerService;
  
  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  /**
   * 채용 정보를 데이터베이스에 저장
   */
  public async saveJob(job: JobInfo, url: string): Promise<void> {
    try {
      await CompanyRecruitmentTable.create({
        company_name: job.companyName,
        job_title: job.jobTitle,
        job_location: job.jobLocation,
        job_type: job.jobType,
        job_salary: job.jobSalary,
        deadline: job.deadline,
        employment_type: job.employmentType || "",
        job_url: url,
        company_type: job.companyType || "",
        job_description: job.jobDescription || "",
        scraped_at: new Date(),
        is_applied: false
      });

      this.logger.logVerbose(`채용 정보 저장: ${job.companyName} - ${job.jobTitle}`);
    } catch (error) {
      this.logger.log(`채용 정보 저장 실패: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * 이미 존재하는 URL 목록 확인
   */
  public async checkExistingUrls(urls: string[]): Promise<string[]> {
    if (urls.length === 0) return [];
    
    try {
      const existingRecords = await CompanyRecruitmentTable.findAll({
        attributes: ['job_url'],
        where: {
          job_url: {
            [sequelize.Op.in]: urls
          }
        },
        raw: true
      });
      
      return existingRecords.map(record => record.job_url);
    } catch (error) {
      this.logger.log(`기존 URL 확인 중 오류: ${error}`, 'error');
      return [];
    }
  }

  /**
   * 채용 데이터 통계 생성
   */
  public createJobStatistics(jobs: JobInfo[]): {
    companyCounts: Record<string, number>,
    jobTypeCounts: Record<string, number>,
    employmentTypeCounts: Record<string, number>,
    topCompanies: [string, number][]
  } {
    const companyCounts: Record<string, number> = {};
    const jobTypeCounts: Record<string, number> = {};
    const employmentTypeCounts: Record<string, number> = {};
    
    jobs.forEach(job => {
      // 회사 카운트
      const company = job.companyName;
      companyCounts[company] = (companyCounts[company] || 0) + 1;
      
      // 직무 유형 카운트
      const jobType = job.jobType || '명시되지 않음';
      jobTypeCounts[jobType] = (jobTypeCounts[jobType] || 0) + 1;
      
      // 고용 형태 카운트
      const empType = job.employmentType || '명시되지 않음';
      employmentTypeCounts[empType] = (employmentTypeCounts[empType] || 0) + 1;
    });
    
    // 상위 회사 목록
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return {
      companyCounts,
      jobTypeCounts,
      employmentTypeCounts,
      topCompanies
    };
  }
  
  /**
   * 최근 채용 공고 가져오기
   */
  public async getRecentJobs(limit: number = 10): Promise<JobInfo[]> {
    try {
      const jobs = await CompanyRecruitmentTable.findAll({
        order: [['scraped_at', 'DESC']],
        limit,
        raw: true
      });
      
      // DB 모델을 JobInfo 형식으로 변환 (모든 필수 필드 포함)
      return jobs.map(job => ({
        id: job.id,
        companyName: job.company_name,
        jobTitle: job.job_title,
        jobLocation: job.job_location || '',
        jobType: job.job_type || '',
        jobSalary: job.job_salary || '',
        deadline: job.deadline || '',
        employmentType: job.employment_type || '',
        url: job.job_url || '',
        companyType: job.company_type || '',
        jobDescription: job.job_description || '',
        // description_type 필드 제거하고 기본값 사용
        descriptionType: 'text',
        scrapedAt: job.scraped_at ? job.scraped_at.toISOString() : new Date().toISOString()
      }));
    } catch (error) {
      this.logger.log(`최근 채용 공고 조회 실패: ${error}`, 'error');
      return [];
    }
  }
  
  /**
   * 매칭 결과로 채용 공고 업데이트
   */
  public async updateJobWithMatchResult(
    jobId: number, 
    matchScore: number,
    matchReason: string,
    isRecommended: boolean,
    strength?: string,
    weakness?: string
  ): Promise<boolean> {
    try {
      const job = await CompanyRecruitmentTable.findByPk(jobId);
      
      if (!job) {
        this.logger.log(`ID ${jobId}에 해당하는 채용 공고를 찾을 수 없습니다`, 'warning');
        return false;
      }
      
      // 매칭 결과 데이터 업데이트
      job.match_score = matchScore;
      job.match_reason = matchReason;
      job.is_recommended = isRecommended;
      job.is_gpt_checked = true;
      
      if (strength) job.strength = strength;
      if (weakness) job.weakness = weakness;
      
      await job.save();
      
      this.logger.logVerbose(`채용 공고 매칭 결과 업데이트 완료 (ID: ${jobId}, 점수: ${matchScore})`);
      return true;
    } catch (error) {
      this.logger.log(`매칭 결과 업데이트 실패 (ID: ${jobId}): ${error}`, 'error');
      return false;
    }
  }
  
  /**
   * 추천 채용 공고 가져오기
   */
  public async getRecommendedJobs(limit: number = 5): Promise<JobMatchResult[]> {
    try {
      const jobs = await CompanyRecruitmentTable.findAll({
        where: {
          is_gpt_checked: true,
          match_score: {
            [sequelize.Op.gte]: 70 // 70점 이상인 채용공고만
          },
          is_recommended: true
        },
        order: [['match_score', 'DESC']],
        limit,
        raw: true
      });
      
      return jobs.map(job => ({
        id: job.id,
        score: job.match_score,
        reason: job.match_reason || '',
        strength: job.strength || '',
        weakness: job.weakness || '',
        apply_yn: job.is_recommended,
        // 추가 정보
        companyName: job.company_name,
        jobTitle: job.job_title,
        jobLocation: job.job_location || '',
        companyType: job.company_type || '',
        url: job.job_url || ''
      }));
    } catch (error) {
      this.logger.log(`추천 채용 공고 조회 실패: ${error}`, 'error');
      return [];
    }
  }
}
