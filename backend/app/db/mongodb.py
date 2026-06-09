import datetime
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings
from app.db import models

logger = logging.getLogger("app.db.mongodb")

_mongo_client = None

def get_mongo_db():
    """
    Get a MongoDB database instance.
    Returns the database object or None if the server is offline or fails to connect.
    """
    global _mongo_client
    try:
        if _mongo_client is None:
            # Short timeout to avoid blocking backend requests if MongoDB is offline
            _mongo_client = MongoClient(
                settings.MONGODB_URL, 
                serverSelectionTimeoutMS=1500, 
                connectTimeoutMS=1500
            )
            # Trigger serverSelectionTimeoutMS check immediately to verify connection
            _mongo_client.server_info()
            logger.info("Successfully connected to MongoDB.")
        return _mongo_client["imms"]
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.warning(f"MongoDB connection failed: {e}. SQLite operations will continue normally.")
        _mongo_client = None
        return None
    except Exception as e:
        logger.error(f"Unexpected MongoDB connection error: {e}")
        _mongo_client = None
        return None

def serialize_sqlalchemy_model(obj):
    """
    Generic serializer for SQLAlchemy model instances into JSON-serializable dictionaries.
    """
    if not obj:
        return None
    data = {}
    for column in obj.__table__.columns:
        val = getattr(obj, column.name)
        if isinstance(val, (datetime.datetime, datetime.date)):
            val = val.isoformat()
        data[column.name] = val
    return data

def sync_user_to_mongo(db_session, user_id: int):
    """
    Sync a user record from SQLite to MongoDB collection.
    """
    db_mongo = get_mongo_db()
    if db_mongo is None:
        return False
    try:
        user_obj = db_session.query(models.User).filter(models.User.id == user_id).first()
        if not user_obj:
            return False
        data = serialize_sqlalchemy_model(user_obj)
        # Exclude password hash from MongoDB for security reasons
        data.pop("password_hash", None)
        db_mongo["users"].replace_one({"id": user_id}, data, upsert=True)
        logger.info(f"Synchronized user {user_id} to MongoDB.")
        return True
    except Exception as e:
        logger.error(f"Failed to sync user {user_id} to MongoDB: {e}")
        return False

def sync_intern_to_mongo(db_session, intern_id: int):
    """
    Sync an intern profile from SQLite to MongoDB collection.
    """
    db_mongo = get_mongo_db()
    if db_mongo is None:
        return False
    try:
        intern_obj = db_session.query(models.Intern).filter(models.Intern.id == intern_id).first()
        if not intern_obj:
            return False
        data = serialize_sqlalchemy_model(intern_obj)
        db_mongo["interns"].replace_one({"id": intern_id}, data, upsert=True)
        logger.info(f"Synchronized intern profile {intern_id} to MongoDB.")
        return True
    except Exception as e:
        logger.error(f"Failed to sync intern {intern_id} to MongoDB: {e}")
        return False

def sync_employee_to_mongo(db_session, employee_id: int):
    """
    Sync an employee profile from SQLite to MongoDB collection.
    """
    db_mongo = get_mongo_db()
    if db_mongo is None:
        return False
    try:
        emp_obj = db_session.query(models.Employee).filter(models.Employee.id == employee_id).first()
        if not emp_obj:
            return False
        data = serialize_sqlalchemy_model(emp_obj)
        db_mongo["employees"].replace_one({"id": employee_id}, data, upsert=True)
        logger.info(f"Synchronized employee profile {employee_id} to MongoDB.")
        return True
    except Exception as e:
        logger.error(f"Failed to sync employee {employee_id} to MongoDB: {e}")
        return False

def delete_intern_from_mongo(intern_id: int):
    """
    Delete an intern profile from MongoDB.
    """
    db_mongo = get_mongo_db()
    if db_mongo is None:
        return False
    try:
        db_mongo["interns"].delete_one({"id": intern_id})
        logger.info(f"Deleted intern profile {intern_id} from MongoDB.")
        return True
    except Exception as e:
        logger.error(f"Failed to delete intern {intern_id} from MongoDB: {e}")
        return False

def delete_employee_from_mongo(employee_id: int):
    """
    Delete an employee profile from MongoDB.
    """
    db_mongo = get_mongo_db()
    if db_mongo is None:
        return False
    try:
        db_mongo["employees"].delete_one({"id": employee_id})
        logger.info(f"Deleted employee profile {employee_id} from MongoDB.")
        return True
    except Exception as e:
        logger.error(f"Failed to delete employee {employee_id} from MongoDB: {e}")
        return False
