/**
 * TypeScript-only imports that pull in all relevant PnP.js module augmentations.
 * Consumers of spfx-toolkit automatically get the extended SPFI surface without
 * needing to duplicate imports in their solutions.
 */
import '@pnp/sp/webs';
import '@pnp/sp/site-users';
import '@pnp/sp/profiles';
import '@pnp/sp/site-groups/web';

import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/batching';
import '@pnp/sp/views';

import '@pnp/sp/fields';
import '@pnp/sp/fields/list';
import '@pnp/sp/column-defaults';
import '@pnp/sp/content-types';

import '@pnp/sp/files';
import '@pnp/sp/folders';
import '@pnp/sp/attachments';

import '@pnp/sp/appcatalog';
import '@pnp/sp/features';
import '@pnp/sp/navigation';
import '@pnp/sp/regional-settings';
import '@pnp/sp/user-custom-actions';

import '@pnp/sp/clientside-pages';
import '@pnp/sp/comments';
import '@pnp/sp/publishing-sitepageservice';

import '@pnp/sp/search';
import '@pnp/sp/favorites';
import '@pnp/sp/subscriptions';

import '@pnp/sp/taxonomy';
import '@pnp/sp/hubsites';

import '@pnp/sp/security';
import '@pnp/sp/sharing';
