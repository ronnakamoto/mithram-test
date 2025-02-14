import { NFTMetadata } from '../contracts/PatientNFT';
import { NFTManager } from '../services/NFTManager';

export interface AnalysisHistoryItem extends NFTMetadata {
  depth?: number;  // How far back in the chain this analysis is
}

export interface AnalysisChangeSummary {
  timeElapsed: number;  // Time elapsed between analyses in milliseconds
  statusChange: boolean;  // Whether the analysis status changed
  newRecommendations: number;  // Number of recommendations in current analysis
  previousRecommendations: number;  // Number of recommendations in previous analysis
  changedRiskFactors?: string[];  // Risk factors that changed between analyses
}

export class AnalysisHistoryManager {
  private nftManager: NFTManager;

  constructor(nftManager: NFTManager) {
    this.nftManager = nftManager;
  }

  /**
   * Fetches the complete analysis history chain for a given analysis ID
   * @param analysisId The ID of the analysis to start from
   * @param maxDepth Maximum number of previous analyses to fetch (optional)
   * @returns Array of analysis items in chronological order (oldest first)
   */
  async getAnalysisHistory(analysisId: string, maxDepth?: number): Promise<AnalysisHistoryItem[]> {
    const history: AnalysisHistoryItem[] = [];
    let currentId: string | null = analysisId;
    let depth = 0;

    while (currentId && (!maxDepth || depth < maxDepth)) {
      try {
        let metadata: NFTMetadata | null;
        
        if (depth === 0) {
          // For the first/current analysis, use getMetadata
          metadata = await this.nftManager.getMetadata(currentId);
        } else {
          // For previous analyses, currentId is already the full ID with timestamp
          metadata = await this.nftManager.getMetadataFromFilebase(`metadata/${currentId}.json`);
        }

        if (!metadata) break;

        // Add depth information
        history.unshift({ ...metadata, depth });

        // Move to previous analysis (metadata.previousAnalysis already contains the ID with timestamp)
        currentId = metadata.previousAnalysis;
        depth++;
      } catch (error) {
        console.error(`Error fetching analysis ${currentId}:`, error);
        break;
      }
    }

    return history;
  }

  /**
   * Gets the most recent analysis for a patient
   * @param patientId The ID of the patient
   * @returns The most recent analysis metadata or null if none found
   */
  async getLatestAnalysis(patientId: string): Promise<AnalysisHistoryItem | null> {
    try {
      const metadata = await this.nftManager.getMetadataByPatientId(patientId);
      return metadata ? { ...metadata, depth: 0 } : null;
    } catch (error) {
      console.error(`Error fetching latest analysis for patient ${patientId}:`, error);
      return null;
    }
  }

  /**
   * Gets a summary of changes between two analyses
   * @param currentAnalysis Current analysis metadata
   * @param previousAnalysis Previous analysis metadata
   * @returns Summary of changes between the analyses
   */
  getChangesSummary(currentAnalysis: NFTMetadata, previousAnalysis: NFTMetadata): AnalysisChangeSummary {
    const currentRiskFactors = currentAnalysis.analysis.recommendations?.riskFactors || [];
    const previousRiskFactors = previousAnalysis.analysis.recommendations?.riskFactors || [];

    // Find risk factors that changed
    const changedRiskFactors = currentRiskFactors.filter(
      risk => !previousRiskFactors.includes(risk)
    );

    return {
      timeElapsed: new Date(currentAnalysis.timestamp).getTime() - new Date(previousAnalysis.timestamp).getTime(),
      statusChange: currentAnalysis.analysis.status !== previousAnalysis.analysis.status,
      newRecommendations: currentAnalysis.analysis.recommendations?.specialists?.length || 0,
      previousRecommendations: previousAnalysis.analysis.recommendations?.specialists?.length || 0,
      changedRiskFactors: changedRiskFactors.length > 0 ? changedRiskFactors : undefined
    };
  }

  /**
   * Gets a paginated history of analyses for a patient
   * @param patientId The ID of the patient
   * @param page Page number (0-based)
   * @param pageSize Number of items per page
   * @returns Paginated array of analysis items and total count
   */
  async getPaginatedHistory(
    patientId: string,
    page: number = 0,
    pageSize: number = 10
  ): Promise<{ items: AnalysisHistoryItem[]; total: number }> {
    try {
      // Get latest analysis first
      const latest = await this.getLatestAnalysis(patientId);
      if (!latest) {
        return { items: [], total: 0 };
      }

      // Get complete history
      const history = await this.getAnalysisHistory(latest.analysisId);
      
      // Calculate pagination
      const start = page * pageSize;
      const end = start + pageSize;
      const items = history.slice(start, end);

      return {
        items,
        total: history.length
      };
    } catch (error) {
      console.error(`Error fetching paginated history for patient ${patientId}:`, error);
      return { items: [], total: 0 };
    }
  }
}
