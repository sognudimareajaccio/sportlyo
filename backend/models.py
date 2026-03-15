from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
    birth_date: Optional[str] = None
    gender: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    user_id: str
    role: str = "participant"
    created_at: datetime
    picture: Optional[str] = None
    iban: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    pps_number: Optional[str] = None
    pps_valid_until: Optional[str] = None


class OrganizerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    company_name: str
    description: Optional[str] = None
    iban: Optional[str] = None
    stripe_account_id: Optional[str] = None
    verified: bool = False


class PricingTier(BaseModel):
    name: str
    price: float
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_registrations: Optional[int] = None


class RaceConfig(BaseModel):
    name: str
    price: float
    max_participants: int
    current_participants: int = 0
    elevation_gain: Optional[int] = None
    distance_km: Optional[float] = None
    description: Optional[str] = None


class WaveConfig(BaseModel):
    wave_id: str
    name: str
    start_time: str
    max_participants: int
    current_participants: int = 0
    race_name: Optional[str] = None


class CustomField(BaseModel):
    field_id: str
    label: str
    field_type: str
    required: bool = False
    options: Optional[List[str]] = None
    conditional_on: Optional[str] = None
    conditional_value: Optional[str] = None


class EventOption(BaseModel):
    option_id: str
    name: str
    description: Optional[str] = None
    price: float
    max_quantity: Optional[int] = None
    image_url: Optional[str] = None


class EventCreate(BaseModel):
    title: str
    description: str
    sport_type: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date: datetime
    end_date: Optional[datetime] = None
    max_participants: int
    price: float
    races: Optional[List[RaceConfig]] = None
    waves: Optional[List[WaveConfig]] = None
    pricing_tiers: Optional[List[PricingTier]] = None
    custom_fields: Optional[List[CustomField]] = None
    options: Optional[List[EventOption]] = None
    distances: List[str] = []
    elevation_gain: Optional[int] = None
    image_url: Optional[str] = None
    route_data: Optional[dict] = None
    route_url: Optional[str] = None
    exact_address: Optional[str] = None
    regulations: Optional[str] = None
    regulations_pdf_url: Optional[str] = None
    published: bool = False
    provides_tshirt: bool = True
    provided_items: Optional[List[str]] = None
    themes: Optional[List[str]] = None
    circuit_type: Optional[str] = None
    has_timer: Optional[bool] = None
    website_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    youtube_url: Optional[str] = None
    requires_pps: bool = False
    requires_medical_cert: bool = False
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    allows_teams: bool = False
    team_min_size: Optional[int] = None
    team_max_size: Optional[int] = None


class TeamCreate(BaseModel):
    event_id: str
    team_name: str
    captain_user_id: str
    selected_race: Optional[str] = None


class TeamMember(BaseModel):
    user_id: str
    name: str
    email: str
    role: str = "member"


class RegistrationCreate(BaseModel):
    event_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    nationality: Optional[str] = None
    selected_race: Optional[str] = None
    selected_wave: Optional[str] = None
    selected_options: Optional[List[str]] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    club_name: Optional[str] = None
    tshirt_size: Optional[str] = None
    ffa_license: Optional[str] = None
    custom_fields_data: Optional[Dict[str, Any]] = None
    team_id: Optional[str] = None
    pps_number: Optional[str] = None


class PromoCode(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    max_uses: Optional[int] = None
    current_uses: int = 0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    event_id: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
