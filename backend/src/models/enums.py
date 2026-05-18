"""All enum definitions used across MongoDB documents and API schemas."""
from enum import Enum


class Currency(str, Enum):
    INR = "INR"
    USD = "USD"
    EUR = "EUR"


class UserType(str, Enum):
    STUDENT = "student"
    EMPLOYED = "employed"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"
    GUEST = "guest"


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SummaryFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BI_WEEKLY = "bi-weekly"
    MONTHLY = "monthly"
    NEVER = "never"


class EducationLevel(str, Enum):
    SCHOOL = "school"
    COLLEGE = "college"
    UNIVERSITY = "university"
    OTHER = "other"


class StudentLivingSituation(str, Enum):
    HOSTEL = "hostel"
    FAMILY = "family"
    RENTAL = "rental"
    PG = "pg"
    OTHER = "other"


class ParentFunded(str, Enum):
    YES = "yes"
    NO = "no"
    PARTIALLY = "partially"


class EmploymentType(str, Enum):
    FULL_TIME = "full-time"
    PART_TIME = "part-time"
    CONTRACT = "contract"
    SELF_EMPLOYED = "self-employed"
    FREELANCE = "freelance"


class PayFrequency(str, Enum):
    WEEKLY = "weekly"
    BI_WEEKLY = "bi-weekly"
    MONTHLY = "monthly"
    SEMI_MONTHLY = "semi-monthly"
    ANNUALLY = "annually"


class RiskTolerance(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ExperienceLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    EXPERT = "expert"


class EmploymentStatus(str, Enum):
    ACTIVELY_SEEKING = "actively-seeking"
    TAKING_BREAK = "taking-break"
    STUDYING = "studying"
    CARING = "caring"
    DISABLED = "disabled"


class UnemployedLivingSituation(str, Enum):
    ALONE = "alone"
    WITH_FAMILY = "with-family"
    WITH_ROOMMATES = "with-roommates"


class GigInterest(str, Enum):
    NOT_AT_ALL = "not-at-all"
    SOMEWHAT = "somewhat"
    VERY_OPEN = "very-open"


class GoalPriority(str, Enum):
    BUILD_EMERGENCY_FUND = "build-emergency-fund"
    REDUCE_DEBT = "reduce-debt"
    COVER_RENT = "cover-rent"
    INVEST_SMALL = "invest-small"
    LEARN_SKILL = "learn-skill"


class GuestStatus(str, Enum):
    STUDENT = "student"
    EMPLOYED = "employed"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"
    EXPLORING = "exploring"


class HelpPreference(str, Enum):
    BUDGET = "budget"
    DEBT = "debt"
    SAVINGS = "savings"
    JOB_SEARCH = "jobSearch"
    INVESTING = "investing"
    RETIREMENT = "retirement"


class GuestSummaryFrequency(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    NEVER = "never"


class TxnType(str, Enum):
    EXPENSE = "expense"
    INCOME = "income"


class Category(str, Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    RENT = "rent"
    BILLS = "bills"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    EDUCATION = "education"
    SAVINGS = "savings"
    SALARY = "salary"
    OTHER_INCOME = "other_income"
    OTHER = "other"
