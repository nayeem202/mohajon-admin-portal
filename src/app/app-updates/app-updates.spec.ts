import { TestBed } from '@angular/core/testing';
import { PortalApiService } from '../core/portal-api.service';
import { AppUpdates, UpdatePolicy, validateUpdatePolicy } from './app-updates';

const policy: UpdatePolicy = {
  platform: 'android',
  forceUpdateEnabled: false,
  minimumVersion: '1.9.0',
  minimumBuildNumber: 3,
  latestVersion: '1.10.0',
  latestBuildNumber: 4,
  updateUrl: 'https://play.google.com/store/apps/details?id=com.mohajon.app',
  messageEn: '',
  messageBn: '',
};

describe('App update policy', () => {
  it('accepts numeric version ordering and prevents an unavailable minimum', () => {
    expect(validateUpdatePolicy(policy)).toBe('');
    expect(validateUpdatePolicy({ ...policy, minimumVersion: '2.0.0' })).not.toBe('');
  });

  it('does not allow mandatory updates without a published store link', () => {
    expect(validateUpdatePolicy({ ...policy, forceUpdateEnabled: true, updateUrl: '' })).not.toBe(
      '',
    );
    expect(validateUpdatePolicy({ ...policy, updateUrl: 'https://example.com/download' })).not.toBe(
      '',
    );
  });

  it('loads and saves the explicit database-backed platform policy', async () => {
    const requests: Array<{ path: string; body: any }> = [];
    await TestBed.configureTestingModule({
      imports: [AppUpdates],
      providers: [
        {
          provide: PortalApiService,
          useValue: {
            get: async () => ({ items: [policy] }),
            put: async (path: string, body: any) => {
              requests.push({ path, body });
              return body;
            },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppUpdates);
    const component = fixture.componentInstance;
    await component.reload();
    expect(component.form.forceUpdateEnabled).toBe(false);
    component.form.forceUpdateEnabled = true;
    await component.save();
    expect(requests[0].path).toBe('/api/v1/platform-admin/app-updates/android');
    expect(requests[0].body.forceUpdateEnabled).toBe(true);
    expect(component.notice()).toContain('after sign-in');
  });
});
