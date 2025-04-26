// Six Slides - Application Bootstrap
import { getService } from './services/dependency_container';
import { ExtractionResult } from './controllers/content_controller';
import { Slide } from './types/index';
import './services/service_registry';
import { loggingService } from './services/logging_service';

async function extractContent(): Promise<Slide[]> {
  loggingService.debug('Extracting content from the page', null, 'content_script');
  try {
    const controller = getService('content_controller');
    const result = await controller.extractContent(document, window.location.href) as ExtractionResult;
    
    if (result.error) {
      return Promise.reject(new Error(result.error));
    }
    
    return result.slides || [];
  } catch (error) {
    return Promise.reject(error);
  }
}

// Set up message handlers
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  const messagingService = getService('messagingService');
  
  messagingService.addMessageListener((message: {action: string, [key: string]: any}) => {
    if (message.action === 'ping') {
      loggingService.debug('Content script ping received', null, 'content_script');
      return { status: 'content_script_ready' };
    }
    
    if (message.action === 'extract_content') {
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const slides = await extractContent();
            
            if (!slides || slides.length === 0) {
              resolve({ error: 'No slides found. Make sure your page has H1 headings to define slides.' });
            } else {
              resolve({ slides });
            }
          } catch (error) {
            resolve({ 
              error: 'Error extracting slides: ' + (error instanceof Error ? error.message : 'Unknown error'),
              stack: error instanceof Error ? error.stack : undefined
            });
          }
        }, 300);
      });
    }
    
    return undefined;
  });
}

export { extractContent };
