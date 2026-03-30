import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Generate a simple browser fingerprint from available browser properties.
 * This is not as robust as FingerprintJS but is free and covers most cases.
 */
export function generateFingerprint(): string {
  const components: string[] = [];

  // Screen resolution
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone offset
  components.push(`tz:${new Date().getTimezoneOffset()}`);

  // Language
  components.push(`lang:${navigator.language}`);

  // Platform
  components.push(`plat:${navigator.platform}`);

  // Hardware concurrency (CPU cores)
  components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);

  // Device memory (if available)
  const nav = navigator as any;
  if (nav.deviceMemory) {
    components.push(`mem:${nav.deviceMemory}`);
  }

  // Touch support
  components.push(`touch:${navigator.maxTouchPoints || 0}`);

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('LavLay FP', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('LavLay FP', 4, 17);
      components.push(`cv:${hashCode(canvas.toDataURL())}`);
    }
  } catch {
    components.push('cv:none');
  }

  // WebGL renderer
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(`gl:${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
      }
    }
  } catch {
    components.push('gl:none');
  }

  const raw = components.join('|');
  return hashCode(raw).toString(16);
}

/**
 * Simple hash function (djb2)
 */
function hashCode(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Record the user's device fingerprint on login/signup.
 * Runs silently in the background - never blocks the user.
 */
export async function recordDeviceFingerprint(userId: string): Promise<void> {
  try {
    const fingerprint = generateFingerprint();
    const userAgent = navigator.userAgent;

    const { data, error } = await supabase.rpc('record_device_fingerprint', {
      p_user_id: userId,
      p_fingerprint: fingerprint,
      p_user_agent: userAgent,
    });

    if (error) {
      logger.error('[Fingerprint] Error recording:', error);
      return;
    }

    if (data?.suspicious) {
      logger.warn(`[Fingerprint] Suspicious: ${data.shared_accounts} accounts on this device`);
    }
  } catch (err) {
    logger.error('[Fingerprint] Failed:', err);
  }
}
