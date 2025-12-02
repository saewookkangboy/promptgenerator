"""
Agent Lightning 프롬프트 최적화 서버
이미지/동영상 프롬프트의 정확성과 품질을 향상시키는 API 서버
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
import logging

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agent Lightning Prompt Optimizer",
    description="AI 프롬프트 최적화 및 템플릿 추천 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# 요청/응답 모델
# ============================================

class PromptOptimizationRequest(BaseModel):
    """프롬프트 최적화 요청"""
    prompt: str = Field(..., description="원본 프롬프트")
    category: str = Field(..., description="카테고리: image, video, text")
    model: Optional[str] = Field(None, description="타겟 모델 (예: midjourney, sora, dalle)")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="추가 옵션")
    user_feedback: Optional[Dict[str, Any]] = Field(None, description="사용자 피드백 (선택적)")

class PromptOptimizationResponse(BaseModel):
    """프롬프트 최적화 응답"""
    original_prompt: str
    optimized_prompt: str
    improvements: List[str] = Field(default_factory=list, description="개선 사항 목록")
    quality_score: float = Field(..., ge=0, le=100, description="품질 점수 (0-100)")
    confidence: float = Field(..., ge=0, le=1, description="신뢰도 (0-1)")
    recommendations: List[str] = Field(default_factory=list, description="추천 사항")

class TemplateRecommendationRequest(BaseModel):
    """템플릿 추천 요청"""
    user_input: str = Field(..., description="사용자 입력")
    category: str = Field(..., description="카테고리: image, video, text")
    model: Optional[str] = Field(None, description="타겟 모델")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="추가 컨텍스트")

class TemplateRecommendationResponse(BaseModel):
    """템플릿 추천 응답"""
    recommended_templates: List[Dict[str, Any]] = Field(default_factory=list)
    reasoning: str = Field(..., description="추천 이유")
    confidence: float = Field(..., ge=0, le=1)

# ============================================
# Agent Lightning 통합
# ============================================

AGENT_LIGHTNING_AVAILABLE = False
agl = None

try:
    import agentlightning as agl
    
    # Agent Lightning 사용 가능 여부 확인
    # 실제 사용은 emit_span 등으로 직접 수행
    AGENT_LIGHTNING_AVAILABLE = True
    logger.info("✅ Agent Lightning 모듈 로드 완료")
except ImportError as e:
    logger.warning(f"⚠️ Agent Lightning을 사용할 수 없습니다: {e}")
    AGENT_LIGHTNING_AVAILABLE = False
    agl = None

# ============================================
# 프롬프트 최적화 로직
# ============================================

def optimize_image_prompt(prompt: str, model: Optional[str] = None, options: Dict = None) -> Dict[str, Any]:
    """이미지 프롬프트 최적화"""
    improvements = []
    optimized = prompt
    
    # 1. 기술적 세부사항 추가
    if "4k" not in prompt.lower() and "8k" not in prompt.lower():
        optimized += ", 4k, ultra detailed"
        improvements.append("고해상도 키워드 추가")
    
    # 2. 스타일 일관성 개선
    if model == "midjourney":
        if "--v" not in prompt and "--style" not in prompt:
            optimized += " --v 6 --style raw"
            improvements.append("Midjourney 버전 및 스타일 파라미터 추가")
    
    # 3. 구도 및 조명 개선
    if "composition" not in prompt.lower() and "lighting" not in prompt.lower():
        optimized += ", professional composition, cinematic lighting"
        improvements.append("전문적인 구도 및 조명 지시 추가")
    
    # 4. 부정 프롬프트 제안
    negative_suggestions = []
    if "blurry" not in prompt.lower():
        negative_suggestions.append("blurry")
    if "low quality" not in prompt.lower():
        negative_suggestions.append("low quality")
    
    quality_score = min(85 + len(improvements) * 5, 100)
    confidence = 0.8 if improvements else 0.6
    
    return {
        "optimized_prompt": optimized,
        "improvements": improvements,
        "quality_score": quality_score,
        "confidence": confidence,
        "negative_suggestions": negative_suggestions
    }

def optimize_video_prompt(prompt: str, model: Optional[str] = None, options: Dict = None) -> Dict[str, Any]:
    """동영상 프롬프트 최적화"""
    improvements = []
    optimized = prompt
    
    # 1. 모션 및 시간 정보 추가
    if "motion" not in prompt.lower() and "movement" not in prompt.lower():
        optimized += ", smooth motion, natural movement"
        improvements.append("자연스러운 모션 지시 추가")
    
    # 2. 카메라 워크 개선
    if "camera" not in prompt.lower():
        optimized += ", cinematic camera movement"
        improvements.append("시네마틱 카메라 워크 추가")
    
    # 3. 일관성 강화
    if model == "sora":
        if "consistent" not in prompt.lower():
            optimized += ", consistent style and lighting"
            improvements.append("스타일 일관성 강화")
    
    # 4. 프레임 레이트 고려
    if "fps" not in prompt.lower() and "frame rate" not in prompt.lower():
        optimized += ", 24fps"
        improvements.append("프레임 레이트 명시")
    
    quality_score = min(80 + len(improvements) * 5, 100)
    confidence = 0.75 if improvements else 0.65
    
    return {
        "optimized_prompt": optimized,
        "improvements": improvements,
        "quality_score": quality_score,
        "confidence": confidence
    }

def optimize_text_prompt(prompt: str, model: Optional[str] = None, options: Dict = None) -> Dict[str, Any]:
    """텍스트 프롬프트 최적화"""
    improvements = []
    optimized = prompt
    
    # 1. 명확성 개선
    if len(prompt.split()) < 10:
        optimized = f"다음 주제에 대해 상세하고 전문적인 내용을 작성해주세요: {prompt}"
        improvements.append("프롬프트 구조화 및 명확성 개선")
    
    # 2. 출력 형식 명시
    if "형식" not in prompt and "format" not in prompt.lower():
        optimized += "\n출력 형식: 구조화된 마크다운 형식"
        improvements.append("출력 형식 명시")
    
    quality_score = min(75 + len(improvements) * 5, 100)
    confidence = 0.7
    
    return {
        "optimized_prompt": optimized,
        "improvements": improvements,
        "quality_score": quality_score,
        "confidence": confidence
    }

# ============================================
# 템플릿 추천 로직
# ============================================

def recommend_templates(user_input: str, category: str, model: Optional[str] = None) -> Dict[str, Any]:
    """템플릿 추천"""
    
    # 카테고리별 기본 템플릿
    image_templates = [
        {
            "name": "고품질 포트레이트",
            "template": "{subject}, professional portrait, studio lighting, 4k, ultra detailed, sharp focus",
            "score": 0.9,
            "reason": "포트레이트 생성에 최적화된 템플릿"
        },
        {
            "name": "시네마틱 풍경",
            "template": "{subject}, cinematic landscape, dramatic lighting, wide angle, 8k, film grain",
            "score": 0.85,
            "reason": "영화적 풍경 이미지 생성에 적합"
        },
        {
            "name": "제품 사진",
            "template": "{subject}, product photography, white background, professional lighting, high detail, commercial quality",
            "score": 0.8,
            "reason": "제품 사진에 최적화"
        }
    ]
    
    video_templates = [
        {
            "name": "단일 장면 동영상",
            "template": "{description}, smooth camera movement, consistent lighting, 24fps, cinematic quality",
            "score": 0.9,
            "reason": "일관된 품질의 동영상 생성"
        },
        {
            "name": "액션 시퀀스",
            "template": "{description}, dynamic action, fast-paced movement, dramatic angles, high energy",
            "score": 0.85,
            "reason": "액션 장면에 최적화"
        }
    ]
    
    templates = image_templates if category == "image" else video_templates if category == "video" else []
    
    # 사용자 입력 기반 매칭 점수 계산
    for template in templates:
        # 간단한 키워드 매칭 (실제로는 더 정교한 NLP 사용)
        user_keywords = set(user_input.lower().split())
        template_keywords = set(template["template"].lower().split())
        overlap = len(user_keywords & template_keywords)
        template["match_score"] = overlap / max(len(user_keywords), 1)
        template["final_score"] = template["score"] * 0.7 + template["match_score"] * 0.3
    
    # 점수 순으로 정렬
    templates.sort(key=lambda x: x["final_score"], reverse=True)
    
    return {
        "recommended_templates": templates[:3],  # 상위 3개
        "reasoning": f"{category} 카테고리에서 사용자 입력과 가장 유사한 템플릿을 추천했습니다.",
        "confidence": templates[0]["final_score"] if templates else 0.5
    }

# ============================================
# API 엔드포인트
# ============================================

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "Agent Lightning Prompt Optimizer",
        "agent_lightning_available": AGENT_LIGHTNING_AVAILABLE
    }

@app.post("/optimize", response_model=PromptOptimizationResponse)
async def optimize_prompt(request: PromptOptimizationRequest):
    """프롬프트 최적화"""
    try:
        category = request.category.lower()
        
        if category == "image":
            result = optimize_image_prompt(request.prompt, request.model, request.options)
        elif category == "video":
            result = optimize_video_prompt(request.prompt, request.model, request.options)
        elif category == "text":
            result = optimize_text_prompt(request.prompt, request.model, request.options)
        else:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 카테고리: {category}")
        
        # Agent Lightning으로 이벤트 기록 (사용 가능한 경우)
        if AGENT_LIGHTNING_AVAILABLE and agl:
            try:
                # Agent Lightning의 emit_message 사용
                agl.emit_message(
                    message=f"Prompt optimized: {category}",
                    metadata={
                        "original": request.prompt,
                        "optimized": result["optimized_prompt"],
                        "score": result["quality_score"],
                        "category": category
                    }
                )
            except Exception as e:
                logger.warning(f"Agent Lightning 이벤트 기록 실패: {e}")
        
        return PromptOptimizationResponse(
            original_prompt=request.prompt,
            optimized_prompt=result["optimized_prompt"],
            improvements=result["improvements"],
            quality_score=result["quality_score"],
            confidence=result["confidence"],
            recommendations=result.get("negative_suggestions", [])
        )
    except Exception as e:
        logger.error(f"프롬프트 최적화 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-templates", response_model=TemplateRecommendationResponse)
async def recommend_templates_endpoint(request: TemplateRecommendationRequest):
    """템플릿 추천"""
    try:
        result = recommend_templates(request.user_input, request.category, request.model)
        
        return TemplateRecommendationResponse(
            recommended_templates=result["recommended_templates"],
            reasoning=result["reasoning"],
            confidence=result["confidence"]
        )
    except Exception as e:
        logger.error(f"템플릿 추천 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

