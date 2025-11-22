# Candidate selectors. Airbnb changes DOM often; adapt these if needed.
CONV_LIST_SELECTOR = 'a[href*="/messaging/threads/"]'
MSG_CONTAINER_SELECTOR = '[data-testid="messages-list"], [data-testid="message-list"], div[role="list"]'
MSG_ITEM_SELECTOR = '[data-testid="message-item"], [data-testid="thread-item"], li[role="listitem"]'
MSG_SENDER_SEL = '[data-testid="message-sender"], .message-sender, .threadItemSender'
MSG_TEXT_SEL = '[data-testid="message-text"], .message-text, .threadMessageText'
MSG_TIME_SEL = 'time, .messageDate'
INPUT_SELECTOR = '[data-testid="thread-message-input"], textarea[name="message"], textarea'
SEND_BUTTON = '[data-testid="thread-send-button"], button[type=submit], button[aria-label*="Send"]'
