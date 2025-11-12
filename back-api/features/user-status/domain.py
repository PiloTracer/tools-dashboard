"""
User Status Feature - Domain Logic
Defines the core business logic for user status management
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional


class SubscriptionTier(str, Enum):
    """Available subscription tiers."""

    FREE = "free"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class UserMetadata:
    """User metadata for status tracking."""

    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    features: list[str] = None

    def __post_init__(self):
        if self.features is None:
            self.features = []


@dataclass
class NavigationState:
    """User navigation state."""

    current_location: str = "/app"
    next_location: Optional[str] = None
    previous_location: Optional[str] = None


@dataclass
class UserStatus:
    """Complete user status information."""

    is_authenticated: bool
    user: Optional[UserMetadata]
    navigation: NavigationState
    timestamp: int

    @classmethod
    def anonymous(cls) -> "UserStatus":
        """Create anonymous user status."""
        return cls(
            is_authenticated=False,
            user=None,
            navigation=NavigationState(),
            timestamp=int(datetime.now().timestamp() * 1000),
        )

    @classmethod
    def authenticated(
        cls, user: UserMetadata, navigation: Optional[NavigationState] = None
    ) -> "UserStatus":
        """Create authenticated user status."""
        return cls(
            is_authenticated=True,
            user=user,
            navigation=navigation or NavigationState(),
            timestamp=int(datetime.now().timestamp() * 1000),
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            "isAuthenticated": self.is_authenticated,
            "user": {
                "id": self.user.id,
                "email": self.user.email,
                "name": self.user.name,
                "avatar": self.user.avatar,
                "subscriptionTier": self.user.subscription_tier.value,
                "features": self.user.features,
            }
            if self.user
            else None,
            "navigation": {
                "currentLocation": self.navigation.current_location,
                "nextLocation": self.navigation.next_location,
                "previousLocation": self.navigation.previous_location,
            },
            "timestamp": self.timestamp,
        }


class UserStatusService:
    """Service for managing user status."""

    def __init__(self):
        """Initialize the user status service."""
        pass

    async def get_user_status(
        self, user_id: Optional[str], email: Optional[str]
    ) -> UserStatus:
        """
        Get current user status.

        Args:
            user_id: User ID if authenticated
            email: User email if authenticated

        Returns:
            UserStatus object
        """
        if not user_id or not email:
            return UserStatus.anonymous()

        # TODO: Fetch user data from database
        # For now, create a basic authenticated user
        user = UserMetadata(
            id=user_id,
            email=email,
            name=email.split("@")[0],  # Extract name from email
            subscription_tier=SubscriptionTier.FREE,
            features=[],
        )

        return UserStatus.authenticated(user)

    async def update_navigation(
        self, user_id: str, current_location: str, next_location: Optional[str] = None
    ) -> NavigationState:
        """
        Update user navigation state.

        Args:
            user_id: User ID
            current_location: Current page location
            next_location: Next intended location (for post-login redirect)

        Returns:
            Updated NavigationState
        """
        # TODO: Persist navigation state to database/cache
        # For now, just return the new state
        return NavigationState(
            current_location=current_location, next_location=next_location
        )

    async def clear_navigation(self, user_id: str) -> None:
        """
        Clear user navigation state.

        Args:
            user_id: User ID
        """
        # TODO: Clear navigation state from database/cache
        pass
