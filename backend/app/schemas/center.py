from pydantic import BaseModel


class CenterResponse(BaseModel):
    id: int
    code: str
    name: str
    region: str
    lat: float
    lng: float

    class Config:
        from_attributes = True
