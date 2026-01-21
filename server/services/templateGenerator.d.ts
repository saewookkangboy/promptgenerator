export interface PromptTemplate {
    title: string;
    description?: string;
    sections: Array<{
        key: string;
        title: string;
        content: string;
        helperText?: string;
    }>;
}
interface TemplateGenerationRequest {
    category: 'text' | 'image' | 'video' | 'engineering';
    baseTemplate?: string;
    context?: string;
}
/**
 * AI를 사용하여 템플릿 생성
 */
export declare function generateTemplateWithAI(request: TemplateGenerationRequest): Promise<PromptTemplate>;
/**
 * 기존 성공 템플릿을 학습하여 새로운 템플릿 생성
 */
export declare function generateTemplateWithLearning(category: 'text' | 'image' | 'video' | 'engineering', count?: number, successfulTemplates?: any[]): Promise<PromptTemplate[]>;
/**
 * 카테고리별 템플릿 자동 생성
 */
export declare function generateTemplatesByCategory(category: 'text' | 'image' | 'video' | 'engineering', count?: number): Promise<PromptTemplate[]>;
export {};
//# sourceMappingURL=templateGenerator.d.ts.map