"""
Sélecteurs CSS/XPath pour Airbnb (centralisés pour faciliter la maintenance)
"""
from typing import Dict

# URLs
HOSTING_MESSAGES_URL = "https://www.airbnb.com/hosting/messages"
THREAD_URL_TEMPLATE = "https://www.airbnb.com/hosting/messages/{thread_id}"

# Sélecteurs pour la liste des conversations
SELECTORS = {
    # Liste des threads
    "thread_list": "[data-testid='inbox-thread-list']",
    "thread_item": "[data-testid='inbox-thread-item']",
    "thread_link": "a[href*='/hosting/messages/']",
    "thread_guest_name": "[data-testid='thread-guest-name']",
    "thread_last_message": "[data-testid='thread-last-message']",
    "thread_unread_badge": "[data-testid='unread-badge']",
    
    # Messages dans une conversation
    "message_container": "[data-testid='message-list']",
    "message_item": "[data-testid='message-card']",
    "message_sender": "[data-testid='message-sender']",
    "message_text": "[data-testid='message-text']",
    "message_time": "[data-testid='message-time']",
    
    # Composer (champ de saisie)
    "composer_input": "[role='textbox']:not(button)",
    "composer_textarea": "textarea",
    "composer_contenteditable": "[contenteditable='true']",
    
    # Bouton d'envoi
    "send_button": "[data-testid*='send']",
    "send_button_submit": "button[type='submit']",
    
    # Navigation
    "login_button": "button[data-testid='login-button']",
    "user_menu": "[data-testid='user-menu']",
}

# Sélecteurs alternatifs (fallback)
FALLBACK_SELECTORS = {
    "composer_input": [
        "[role='textbox']:not(button)",
        "textarea",
        "[contenteditable='true']",
        "[contenteditable='true'][role='textbox']",
    ],
    "send_button": [
        "[data-testid*='send']",
        "button[type='submit']",
        "button[aria-label*='send' i]",
        "button[aria-label*='envoyer' i]",
    ],
}

# GraphQL API endpoints (pour récupération directe)
GRAPHQL_ENDPOINTS = {
    "inbox_data": "/api/v3/ViaductInboxData",
    "thread_data": "/api/v3/ViaductGetThreadAndDataQuery",
}

# Query hashes pour GraphQL
GRAPHQL_QUERY_HASHES = {
    "inbox_data": "d29354be6227b5d0f7f65895012fbfa5c38f31b7fcf829cf340188ea8cff3d9a",
    "thread_data": "d29354be6227b5d0f7f65895012fbfa5c38f31b7fcf829cf340188ea8cff3d9a",
}


def get_selector(key: str) -> str:
    """Récupère un sélecteur par sa clé"""
    return SELECTORS.get(key, "")


def get_fallback_selectors(key: str) -> list:
    """Récupère les sélecteurs de fallback pour une clé"""
    return FALLBACK_SELECTORS.get(key, [])


