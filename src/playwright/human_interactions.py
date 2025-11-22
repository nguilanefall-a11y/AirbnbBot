"""
Interactions humaines pour rendre le comportement Playwright plus naturel
"""
import random
import time
import logging
from typing import Optional
from playwright.sync_api import Page, Locator
from src.config import settings

logger = logging.getLogger(__name__)


class HumanInteraction:
    """Classe pour simuler des interactions humaines"""
    
    @staticmethod
    def random_delay(min_ms: Optional[int] = None, max_ms: Optional[int] = None):
        """
        Délai aléatoire pour simuler un temps de réaction humain
        
        Args:
            min_ms: Délai minimum en millisecondes
            max_ms: Délai maximum en millisecondes
        """
        if not settings.RANDOM_DELAY_ENABLED:
            return
        
        min_delay = min_ms or settings.MIN_DELAY_MS
        max_delay = max_ms or settings.MAX_DELAY_MS
        
        # Distribution plus humaine (légèrement plus long souvent)
        delay = random.gammavariate(alpha=2, beta=(max_delay - min_delay) / 2000) * 1000
        delay = max(min_delay, min(max_delay, delay))
        
        time.sleep(delay / 1000.0)
    
    @staticmethod
    def human_type_delay() -> float:
        """
        Délai entre chaque caractère lors de la saisie
        
        Returns:
            Délai en secondes (50-200ms avec variation)
        """
        base_delay = random.uniform(50, 150) / 1000.0
        # Ajouter des pauses occasionnelles (comme un humain qui réfléchit)
        if random.random() < 0.1:  # 10% de chance de pause
            base_delay += random.uniform(200, 500) / 1000.0
        return base_delay
    
    @staticmethod
    def scroll_naturally(page: Page, element: Optional[Locator] = None):
        """
        Scroll de manière naturelle vers un élément ou dans la page
        
        Args:
            page: Page Playwright
            element: Élément optionnel vers lequel scroller
        """
        try:
            if element:
                # Scroll progressif vers l'élément
                for _ in range(random.randint(2, 4)):
                    element.scroll_into_view_if_needed()
                    HumanInteraction.random_delay(200, 500)
            else:
                # Scroll naturel dans la page (comme un humain qui lit)
                scroll_amount = random.randint(300, 600)
                page.mouse.wheel(0, scroll_amount)
                HumanInteraction.random_delay(300, 600)
        except Exception as e:
            logger.debug(f"Scroll naturel échoué (non critique): {e}")
    
    @staticmethod
    def move_mouse_naturally(page: Page):
        """
        Mouvement de souris naturel (pour paraître plus humain)
        
        Args:
            page: Page Playwright
        """
        try:
            # Petit mouvement aléatoire de souris
            x = random.randint(-50, 50)
            y = random.randint(-50, 50)
            page.mouse.move(x, y)
            HumanInteraction.random_delay(100, 300)
        except Exception as e:
            logger.debug(f"Movement souris échoué (non critique): {e}")
    
    @staticmethod
    def click_with_delay(element: Locator, delay_before: Optional[int] = None, delay_after: Optional[int] = None):
        """
        Clique sur un élément avec des délais naturels
        
        Args:
            element: Locator de l'élément
            delay_before: Délai avant le clic (ms)
            delay_after: Délai après le clic (ms)
        """
        if delay_before:
            time.sleep(delay_before / 1000.0)
        elif settings.RANDOM_DELAY_ENABLED:
            HumanInteraction.random_delay(200, 500)
        
        element.click()
        
        if delay_after:
            time.sleep(delay_after / 1000.0)
        elif settings.RANDOM_DELAY_ENABLED:
            HumanInteraction.random_delay(300, 800)
    
    @staticmethod
    def type_with_human_rhythm(element: Locator, text: str):
        """
        Tape du texte avec un rythme humain (pauses, fautes corrigées)
        
        Args:
            element: Locator du champ de texte
            text: Texte à taper
        """
        try:
            element.click()
            HumanInteraction.random_delay(200, 400)
            
            # Simulation de frappe humaine avec pauses occasionnelles
            for i, char in enumerate(text):
                element.type(char, delay=HumanInteraction.human_type_delay())
                
                # Parfois faire une pause (comme si on réfléchissait)
                if i > 0 and i % random.randint(20, 40) == 0:
                    HumanInteraction.random_delay(500, 1500)
                    
        except Exception as e:
            logger.warning(f"Erreur lors de la frappe: {e}")
            # Fallback: remplir directement
            try:
                element.fill(text)
            except:
                raise


