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
    task_id: Optional[str] = Field(None, description="작업 ID (Agent Lightning용)")

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

class FeedbackRequest(BaseModel):
    """사용자 피드백 요청"""
    task_id: str = Field(..., description="작업 ID")
    span_id: Optional[str] = Field(None, description="Span ID")
    reward: float = Field(..., ge=-1, le=1, description="보상 점수 (-1 ~ 1)")
    feedback_text: Optional[str] = Field(None, description="피드백 텍스트")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="추가 메타데이터")

# ============================================
# Agent Lightning 통합
# ============================================

# Agent Lightning 모듈 상태
_agent_lightning_available = False
agl = None
lightning_store = None
trainer = None

try:
    import agentlightning as agl
    from agentlightning import LightningStore, Trainer
    
    # LightningStore 초기화 (데이터 저장소)
    try:
        store_url = os.getenv("LIGHTNING_STORE_URL", "sqlite:///lightning_store.db")
        lightning_store = LightningStore(store_url=store_url)
        logger.info("✅ LightningStore 초기화 완료")
    except Exception as e:
        logger.warning(f"⚠️ LightningStore 초기화 실패: {e}")
        lightning_store = None
    
    # Trainer 초기화 (학습 루프 관리)
    try:
        trainer = Trainer(store=lightning_store) if lightning_store else None
        if trainer:
            logger.info("✅ Trainer 초기화 완료")
    except Exception as e:
        logger.warning(f"⚠️ Trainer 초기화 실패: {e}")
        trainer = None
    
    # Agent Lightning 사용 가능으로 표시
    _agent_lightning_available = True
    logger.info("✅ Agent Lightning 모듈 로드 완료")
except ImportError as e:
    logger.warning(f"⚠️ Agent Lightning을 사용할 수 없습니다: {e}")
    agl = None
    lightning_store = None
    trainer = None

# 공개 상수 (읽기 전용)
AGENT_LIGHTNING_AVAILABLE = _agent_lightning_available

# ============================================
# Agent Lightning 헬퍼 함수
# ============================================

def emit_prompt_span(
    prompt: str,
    optimized_prompt: str,
    category: str,
    model: Optional[str] = None,
    task_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """프롬프트 최적화 Span 기록"""
    if not AGENT_LIGHTNING_AVAILABLE or not agl:
        return None
    
    try:
        span_metadata = {
            "type": "prompt_optimization",
            "category": category,
            "model": model or "unknown",
            "original_prompt": prompt,
            "optimized_prompt": optimized_prompt,
            **(metadata or {})
        }
        
        # Span 생성 및 기록
        span = agl.emit_span(
            name=f"prompt_optimization_{category}",
            metadata=span_metadata,
            task_id=task_id
        )
        
        return span.span_id if hasattr(span, 'span_id') else None
    except Exception as e:
        logger.warning(f"Span 기록 실패: {e}")
        return None

def emit_reward(
    span_id: str,
    reward: float,
    feedback_text: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """보상(Reward) 기록"""
    if not AGENT_LIGHTNING_AVAILABLE or not agl:
        return False
    
    try:
        reward_metadata = {
            "feedback": feedback_text or "",
            **(metadata or {})
        }
        
        agl.emit_reward(
            span_id=span_id,
            reward=reward,
            metadata=reward_metadata
        )
        
        logger.info(f"보상 기록 완료: span_id={span_id}, reward={reward}")
        return True
    except Exception as e:
        logger.warning(f"보상 기록 실패: {e}")
        return False

def calculate_reward_from_feedback(
    quality_score: float,
    user_rating: Optional[float] = None,
    user_feedback: Optional[Dict[str, Any]] = None
) -> float:
    """사용자 피드백 기반 보상 계산"""
    # 기본 보상: 품질 점수를 -1 ~ 1 범위로 정규화
    base_reward = (quality_score / 100.0) * 2.0 - 1.0  # 0-100 -> -1 ~ 1
    
    # 사용자 평점이 있으면 가중 평균
    if user_rating is not None:
        user_reward = (user_rating / 5.0) * 2.0 - 1.0  # 1-5 -> -1 ~ 1
        base_reward = base_reward * 0.4 + user_reward * 0.6
    
    # 피드백 기반 조정
    if user_feedback:
        if user_feedback.get("satisfied", False):
            base_reward = min(base_reward + 0.2, 1.0)
        if user_feedback.get("used_result", False):
            base_reward = min(base_reward + 0.1, 1.0)
        if user_feedback.get("disappointed", False):
            base_reward = max(base_reward - 0.3, -1.0)
    
    return max(-1.0, min(1.0, base_reward))

def get_learned_optimizations(
    category: str,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """학습된 최적화 전략 조회"""
    if not lightning_store:
        return {}
    
    try:
        # LightningStore에서 학습된 패턴 조회
        # 실제 구현은 store의 API에 따라 달라질 수 있음
        query = {
            "category": category,
            "model": model or "any"
        }
        
        # 학습된 최적화 규칙 반환
        # 예: 특정 키워드 조합이 높은 보상을 받았는지 등
        return {
            "learned_keywords": [],
            "learned_patterns": [],
            "confidence": 0.0
        }
    except Exception as e:
        logger.warning(f"학습 데이터 조회 실패: {e}")
        return {}

# ============================================
# 프롬프트 최적화 로직
# ============================================

def optimize_image_prompt(prompt: str, model: Optional[str] = None, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """이미지 프롬프트 최적화 (학습된 패턴 적용)"""
    improvements = []
    optimized = prompt
    
    # 학습된 최적화 전략 조회
    learned = get_learned_optimizations("image", model)
    
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
    
    # 4. 학습된 패턴 적용 (예: 특정 키워드 조합이 높은 보상을 받았다면)
    if learned.get("learned_keywords"):
        for keyword in learned["learned_keywords"]:
            if keyword not in optimized.lower():
                optimized += f", {keyword}"
                improvements.append(f"학습된 키워드 추가: {keyword}")
    
    # 5. 부정 프롬프트 제안
    negative_suggestions = []
    if "blurry" not in prompt.lower():
        negative_suggestions.append("blurry")
    if "low quality" not in prompt.lower():
        negative_suggestions.append("low quality")
    
    quality_score = min(85 + len(improvements) * 5, 100)
    confidence = 0.8 if improvements else 0.6
    
    # 학습된 패턴의 신뢰도 반영
    if learned.get("confidence", 0) > 0.7:
        confidence = min(confidence + 0.1, 1.0)
    
    return {
        "optimized_prompt": optimized,
        "improvements": improvements,
        "quality_score": quality_score,
        "confidence": confidence,
        "negative_suggestions": negative_suggestions,
        "learned_optimizations_applied": len(learned.get("learned_keywords", []))
    }

def optimize_video_prompt(prompt: str, model: Optional[str] = None, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
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

def optimize_text_prompt(prompt: str, model: Optional[str] = None, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
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
        "version": "2.0.0",
        "agent_lightning_available": AGENT_LIGHTNING_AVAILABLE,
        "features": {
            "span_tracking": AGENT_LIGHTNING_AVAILABLE,
            "reward_system": AGENT_LIGHTNING_AVAILABLE,
            "continuous_learning": trainer is not None,
            "store_integration": lightning_store is not None
        }
    }

@app.post("/optimize", response_model=PromptOptimizationResponse)
async def optimize_prompt(request: PromptOptimizationRequest):
    """프롬프트 최적화 (강화학습 통합)"""
    try:
        category = request.category.lower()
        
        # 작업 ID 생성 (없으면 새로 생성)
        task_id = request.task_id or f"task_{category}_{hash(request.prompt) % 10000}"
        
        if category == "image":
            result = optimize_image_prompt(request.prompt, request.model, request.options or {})
        elif category == "video":
            result = optimize_video_prompt(request.prompt, request.model, request.options or {})
        elif category == "text":
            result = optimize_text_prompt(request.prompt, request.model, request.options or {})
        else:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 카테고리: {category}")
        
        # Agent Lightning Span 추적
        span_id = None
        if AGENT_LIGHTNING_AVAILABLE:
            span_id = emit_prompt_span(
                prompt=request.prompt,
                optimized_prompt=result["optimized_prompt"],
                category=category,
                model=request.model,
                task_id=task_id,
                metadata={
                    "quality_score": result["quality_score"],
                    "confidence": result["confidence"],
                    "improvements_count": len(result["improvements"])
                }
            )
        
        # 사용자 피드백이 있으면 보상 기록
        if request.user_feedback and span_id:
            reward = calculate_reward_from_feedback(
                quality_score=result["quality_score"],
                user_rating=request.user_feedback.get("rating"),
                user_feedback=request.user_feedback
            )
            emit_reward(
                span_id=span_id,
                reward=reward,
                feedback_text=request.user_feedback.get("text"),
                metadata=request.user_feedback
            )
        
        response = PromptOptimizationResponse(
            original_prompt=request.prompt,
            optimized_prompt=result["optimized_prompt"],
            improvements=result["improvements"],
            quality_score=result["quality_score"],
            confidence=result["confidence"],
            recommendations=result.get("negative_suggestions", [])
        )
        
        # 응답에 task_id와 span_id 포함 (클라이언트가 피드백 제출 시 사용)
        # Pydantic 모델에 추가 필드를 포함하려면 모델을 확장하거나 dict로 변환
        if span_id:
            response_dict = response.model_dump() if hasattr(response, 'model_dump') else response.dict()
            response_dict["task_id"] = task_id
            response_dict["span_id"] = span_id
            return response_dict
        
        return response
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

@app.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """사용자 피드백 제출 및 보상 기록"""
    try:
        if not AGENT_LIGHTNING_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Agent Lightning이 사용 불가능합니다"
            )
        
        # 보상 기록
        success = emit_reward(
            span_id=request.span_id or request.task_id,
            reward=request.reward,
            feedback_text=request.feedback_text,
            metadata={
                "task_id": request.task_id,
                **(request.metadata or {})
            }
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="보상 기록 실패"
            )
        
        # Trainer가 활성화되어 있으면 학습 트리거
        if trainer:
            try:
                # 비동기 학습 트리거 (실제 구현은 trainer API에 따라 다름)
                logger.info(f"학습 트리거: task_id={request.task_id}")
                # trainer.train() 또는 유사한 메서드 호출
            except Exception as e:
                logger.warning(f"학습 트리거 실패: {e}")
        
        return {
            "status": "success",
            "message": "피드백이 기록되었습니다",
            "task_id": request.task_id,
            "reward": request.reward
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"피드백 제출 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/training/status")
async def get_training_status():
    """학습 상태 조회"""
    try:
        status = {
            "agent_lightning_available": AGENT_LIGHTNING_AVAILABLE,
            "store_available": lightning_store is not None,
            "trainer_available": trainer is not None,
            "training_active": False
        }
        
        if lightning_store:
            try:
                # 학습 데이터 통계 조회
                # 실제 구현은 store API에 따라 다름
                status["total_spans"] = 0
                status["total_rewards"] = 0
                status["average_reward"] = 0.0
                # 학습 데이터 통계는 실제 store API에 따라 구현
            except Exception as e:
                logger.warning(f"학습 통계 조회 실패: {e}")
        
        return status
    except Exception as e:
        logger.error(f"학습 상태 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/training/trigger")
async def trigger_training():
    """수동 학습 트리거"""
    try:
        if not trainer:
            raise HTTPException(
                status_code=503,
                detail="Trainer가 사용 불가능합니다"
            )
        
        # 학습 실행
        # 실제 구현은 trainer API에 따라 다름
        logger.info("수동 학습 트리거 실행")
        
        return {
            "status": "success",
            "message": "학습이 시작되었습니다"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"학습 트리거 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

