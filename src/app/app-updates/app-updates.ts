import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalApiService } from '../core/portal-api.service';

export interface UpdatePolicy {
  platform: 'android' | 'ios';
  forceUpdateEnabled: boolean;
  minimumVersion: string;
  minimumBuildNumber: number;
  latestVersion: string;
  latestBuildNumber: number;
  updateUrl: string;
  messageEn: string;
  messageBn: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-update-settings',
  imports: [FormsModule],
  templateUrl: './app-updates.html',
  styleUrl: './app-updates.scss',
})
export class AppUpdates implements OnInit {
  readonly busy = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  private policies: UpdatePolicy[] = [];
  platform: 'android' | 'ios' = 'android';
  form: UpdatePolicy = this.emptyPolicy();

  constructor(private readonly api: PortalApiService) {}

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    if (this.busy()) return;
    await this.run(async () => {
      const result = await this.api.get('/api/v1/platform-admin/app-updates');
      this.policies = result.items ?? [];
      this.selectPlatform();
      this.loaded.set(this.policies.some((item) => item.platform === this.platform));
      if (!this.loaded())
        throw new Error('No app release policy was returned. Refresh to try again.');
    });
  }

  selectPlatform(): void {
    const policy = this.policies.find((item) => item.platform === this.platform);
    this.form = { ...(policy ?? this.emptyPolicy()) };
    this.loaded.set(!!policy);
    this.error.set('');
    this.notice.set('');
  }

  async save(): Promise<void> {
    if (this.busy() || !this.loaded()) return;
    const validation = validateUpdatePolicy(this.form);
    if (validation) {
      this.error.set(validation);
      return;
    }
    await this.run(async () => {
      const saved = (await this.api.put(`/api/v1/platform-admin/app-updates/${this.platform}`, {
        ...this.form,
        minimumVersion: this.form.minimumVersion.trim(),
        latestVersion: this.form.latestVersion.trim(),
        updateUrl: this.form.updateUrl.trim(),
        messageEn: this.form.messageEn.trim(),
        messageBn: this.form.messageBn.trim(),
      })) as UpdatePolicy;
      this.policies = [...this.policies.filter((item) => item.platform !== saved.platform), saved];
      this.form = { ...saved };
      this.notice.set(
        saved.forceUpdateEnabled
          ? 'Mandatory update policy saved. Older app versions are checked after sign-in.'
          : 'Policy saved. Mandatory updates are turned off.',
      );
    });
  }

  private emptyPolicy(): UpdatePolicy {
    return {
      platform: this.platform,
      forceUpdateEnabled: false,
      minimumVersion: '1.0.0',
      minimumBuildNumber: 1,
      latestVersion: '1.0.0',
      latestBuildNumber: 1,
      updateUrl: '',
      messageEn: '',
      messageBn: '',
    };
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await work();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Could not save the app release policy.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}

export function validateUpdatePolicy(policy: UpdatePolicy): string {
  const version = /^(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})$/;
  if (
    ![policy.minimumVersion.trim(), policy.latestVersion.trim()].every((value) =>
      version.test(value),
    )
  )
    return 'Enter versions in the format 1.2.0.';
  if (
    ![policy.minimumBuildNumber, policy.latestBuildNumber].every(
      (value) => Number.isSafeInteger(value) && value >= 1 && value <= 2_100_000_000,
    )
  )
    return 'Enter positive whole build numbers (up to 2100000000).';
  const minimum = policy.minimumVersion.trim().split('.').map(Number);
  const latest = policy.latestVersion.trim().split('.').map(Number);
  const different = latest.findIndex((part, index) => part !== minimum[index]);
  if (
    (different >= 0 && latest[different] < minimum[different]) ||
    (different < 0 && policy.latestBuildNumber < policy.minimumBuildNumber)
  )
    return 'The latest release must meet the minimum supported version and build.';
  if (policy.forceUpdateEnabled && !policy.updateUrl.trim())
    return 'Add the published app-store link before enabling mandatory updates.';
  if (policy.updateUrl.trim()) {
    try {
      const url = new URL(policy.updateUrl.trim());
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash)
        return 'Enter a valid HTTPS app-store URL.';
      if (
        policy.platform === 'android' &&
        (url.hostname !== 'play.google.com' ||
          url.pathname !== '/store/apps/details' ||
          !url.searchParams.get('id'))
      )
        return 'Use the Google Play listing URL, including the app package ID.';
      if (
        policy.platform === 'ios' &&
        (url.hostname !== 'apps.apple.com' || !/\/id[0-9]+\/?$/.test(url.pathname))
      )
        return 'Use the published apps.apple.com listing URL.';
    } catch {
      return 'Enter a valid HTTPS app-store URL.';
    }
  }
  return '';
}
