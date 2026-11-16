
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from backend.repository import (
    get_sources,
    get_experiments,
    validate_catalog,
)
from backend.schemas import (
    Source,
    Experiment,
    SearchRequest,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_catalog()
    yield


app = FastAPI(
    title="IGNIS Research API",
    description="NASA Microgravity Combustion Intelligence",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "IGNIS Research API",
        "version": "0.1.0",
    }


@app.get("/sources", response_model=list[Source])
def sources():
    return get_sources()


@app.get(
    "/experiments",
    response_model=list[Experiment],
)
def experiments():
    return get_experiments()


@app.get(
    "/experiments/{experiment_id}",
    response_model=Experiment,
)
def experiment_detail(experiment_id: str):
    for record in get_experiments():
        if record.id == experiment_id:
            return record

    raise HTTPException(
        status_code=404,
        detail="Experiment not found",
    )


@app.post("/search")
def search(request: SearchRequest):
    query = request.query.lower().strip()
    results = []

    for experiment in get_experiments():
        text = (
            experiment.test_id + " " +
            experiment.investigation_id + " " +
            " ".join(
                str(m.value or "")
                for m in experiment.measurements.values()
            )
        ).lower()

        if query in text:
            results.append(experiment)

    return {
        "query": request.query,
        "total": len(results),
        "results": results[:request.limit],
    }

from backend.phase2.routes import router as phase2_router

app.include_router(phase2_router)


from backend.phase3.routes import router as phase3_router

app.include_router(phase3_router)

from backend.phase5.routes import router as phase5_router
app.include_router(phase5_router)

from backend.phase6.routes import router as phase6_router
app.include_router(phase6_router)

from backend.phase7.routes import router as phase7_router
app.include_router(phase7_router)

from backend.phase7.security import install_security
install_security(app)
