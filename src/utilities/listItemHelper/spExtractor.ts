/**
 * Simple SharePoint value extractor - returns full objects for complex fields
 * File: spExtractor.ts
 */

import { IPrincipal, SPImage, SPLocation, SPLookup, SPTaxonomy, SPUrl } from '../../types';

export function createSPExtractor(item: any) {
  return {
    // Basic value types
    string: (fieldName: string, defaultValue = '') => {
      if (!item || !fieldName) return defaultValue;
      const value = item[fieldName];
      return value !== null && value !== undefined ? String(value) : defaultValue;
    },

    number: (fieldName: string, defaultValue = 0) => {
      if (!item || !fieldName) return defaultValue;
      const value = item[fieldName];
      if (value === null || value === undefined || value === '') return defaultValue;
      const numValue = Number(value);
      return isNaN(numValue) ? defaultValue : numValue;
    },

    boolean: (fieldName: string, defaultValue = false) => {
      if (!item || !fieldName) return defaultValue;
      const value = item[fieldName];
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1') return true;
        if (lowerValue === 'no' || lowerValue === 'false' || lowerValue === '0') return false;
      }
      return Boolean(value);
    },

    date: (fieldName: string, defaultValue?: Date) => {
      if (!item || !fieldName) return defaultValue;
      const value = item[fieldName];
      if (value === null || value === undefined || value === '') return defaultValue;
      if (value instanceof Date) return value;
      const dateValue = new Date(value);
      return isNaN(dateValue.getTime()) ? defaultValue : dateValue;
    },

    // Complex field types - return full objects

    user: (fieldName: string): IPrincipal | undefined => {
      if (!item || !fieldName) return undefined;
      const userObj = item[fieldName];
      if (!userObj || typeof userObj !== 'object') return undefined;

      // SharePoint sometimes returns array even for single user field
      if (Array.isArray(userObj)) {
        if (userObj.length === 0) return undefined;
        // Extract first user from array and map to IPrincipal
        const firstUser = userObj[0];
        const mapped: IPrincipal = {
          id: (firstUser.ID || firstUser.id || '').toString(),
          email: firstUser.EMail || firstUser.email || undefined,
          title: firstUser.Title || firstUser.title || firstUser.text || undefined,
          value: firstUser.Name || firstUser.loginName || undefined,
          loginName: firstUser.Name || firstUser.loginName || undefined,
          department: firstUser.Department || firstUser.department || undefined,
          jobTitle: firstUser.JobTitle || firstUser.jobTitle || undefined,
          sip: firstUser.SIP || firstUser.sip || undefined,
          picture: firstUser.Picture || firstUser.picture || undefined,
        };
        return mapped.id !== '' ? mapped : undefined;
      }

      // Normal user object (non-array)
      const mapped: IPrincipal = {
        id: (userObj.ID || userObj.id || '').toString(),
        email: userObj.EMail || userObj.email || undefined,
        title: userObj.Title || userObj.title || userObj.text || undefined,
        value: userObj.Name || userObj.loginName || undefined,
        loginName: userObj.Name || userObj.loginName || undefined,
        department: userObj.Department || userObj.department || undefined,
        jobTitle: userObj.JobTitle || userObj.jobTitle || undefined,
        sip: userObj.SIP || userObj.sip || undefined,
        picture: userObj.Picture || userObj.picture || undefined,
      };
      return mapped.id !== '' ? mapped : undefined;
    },

    userMulti: (fieldName: string): IPrincipal[] => {
      if (!item || !fieldName) return [];
      let users = item[fieldName];

      // Handle results array format (PnP.js)
      if (users && typeof users === 'object' && users.results && Array.isArray(users.results)) {
        users = users.results;
      }

      if (!Array.isArray(users)) return [];

      return users
        .map(userObj => ({
          id: (userObj.ID || userObj.id || '').toString(),
          email: userObj.EMail || userObj.email || undefined,
          title: userObj.Title || userObj.title || userObj.text || undefined,
          value: userObj.Name || userObj.loginName || undefined,
          loginName: userObj.Name || userObj.loginName || undefined,
          department: userObj.Department || userObj.department || undefined,
          jobTitle: userObj.JobTitle || userObj.jobTitle || undefined,
          sip: userObj.SIP || userObj.sip || undefined,
          picture: userObj.Picture || userObj.picture || undefined,
        }))
        .filter(user => user.id !== '');
    },

    lookup: (fieldName: string): SPLookup | undefined => {
      if (!item || !fieldName) return undefined;
      const lookupObj = item[fieldName];
      if (!lookupObj || typeof lookupObj !== 'object') return undefined;

      return {
        id: lookupObj.ID || lookupObj.id || undefined,
        title: lookupObj.Title || lookupObj.title || undefined,
      };
    },

    lookupMulti: (fieldName: string): SPLookup[] => {
      if (!item || !fieldName) return [];
      let lookups = item[fieldName];

      // Handle results array format (PnP.js)
      if (
        lookups &&
        typeof lookups === 'object' &&
        lookups.results &&
        Array.isArray(lookups.results)
      ) {
        lookups = lookups.results;
      }

      if (!Array.isArray(lookups)) return [];

      return lookups
        .map(lookupObj => ({
          id: lookupObj.ID || lookupObj.id || undefined,
          title: lookupObj.Title || lookupObj.title || undefined,
        }))
        .filter(lookup => lookup.id !== undefined);
    },

    taxonomy: (fieldName: string): SPTaxonomy | undefined => {
      if (!item || !fieldName) return undefined;
      const taxObj = item[fieldName];
      if (!taxObj || typeof taxObj !== 'object') return undefined;

      return {
        label: taxObj.Label || taxObj.label || undefined,
        termId: taxObj.TermGuid || taxObj.TermID || taxObj.termId || undefined,
        wssId: taxObj.WssId || taxObj.wssId || undefined,
      };
    },

    taxonomyMulti: (fieldName: string): SPTaxonomy[] => {
      if (!item || !fieldName) return [];
      let taxonomies = item[fieldName];

      // Handle results array format (PnP.js)
      if (
        taxonomies &&
        typeof taxonomies === 'object' &&
        taxonomies.results &&
        Array.isArray(taxonomies.results)
      ) {
        taxonomies = taxonomies.results;
      }

      if (!Array.isArray(taxonomies)) return [];

      return taxonomies
        .map(taxObj => ({
          label: taxObj.Label || taxObj.label || undefined,
          termId: taxObj.TermGuid || taxObj.TermID || taxObj.termId || undefined,
          wssId: taxObj.WssId || taxObj.wssId || undefined,
        }))
        .filter(tax => tax.label !== undefined || tax.termId !== undefined);
    },

    choice: (fieldName: string, defaultValue = '') => {
      if (!item || !fieldName) return defaultValue;
      const value = item[fieldName];
      return value !== null && value !== undefined ? String(value) : defaultValue;
    },

    multiChoice: (fieldName: string): string[] => {
      if (!item || !fieldName) return [];
      let choices = item[fieldName];

      // Handle results array format (PnP.js)
      if (
        choices &&
        typeof choices === 'object' &&
        choices.results &&
        Array.isArray(choices.results)
      ) {
        choices = choices.results;
      }

      // Handle array format
      if (Array.isArray(choices)) {
        return choices.filter(choice => choice !== null && choice !== undefined && choice !== '');
      }

      // Handle semicolon-delimited string
      if (typeof choices === 'string' && choices.length > 0) {
        return choices.split(';#').filter(choice => choice.length > 0);
      }

      return [];
    },

    url: (fieldName: string): SPUrl | undefined => {
      if (!item || !fieldName) return undefined;
      const urlObj = item[fieldName];
      if (!urlObj || typeof urlObj !== 'object') return undefined;

      return {
        url: urlObj.Url || urlObj.url || undefined,
        description: urlObj.Description || urlObj.description || undefined,
      };
    },

    // Modern SharePoint field types

    location: (fieldName: string): SPLocation | undefined => {
      if (!item || !fieldName) return undefined;
      const locationObj = item[fieldName];
      if (!locationObj || typeof locationObj !== 'object') return undefined;

      return {
        displayName: locationObj.DisplayName || locationObj.displayName || undefined,
        locationUri: locationObj.LocationUri || locationObj.locationUri || undefined,
        coordinates: {
          latitude:
            locationObj.Coordinates?.Latitude || locationObj.coordinates?.latitude || undefined,
          longitude:
            locationObj.Coordinates?.Longitude || locationObj.coordinates?.longitude || undefined,
        },
      };
    },

    image: (fieldName: string): SPImage | undefined => {
      if (!item || !fieldName) return undefined;
      const imageObj = item[fieldName];
      if (!imageObj || typeof imageObj !== 'object') return undefined;

      return {
        serverUrl: imageObj.ServerUrl || imageObj.serverUrl || undefined,
        serverRelativeUrl: imageObj.ServerRelativeUrl || imageObj.serverRelativeUrl || undefined,
        id: imageObj.Id || imageObj.id || undefined,
        fileName: imageObj.FileName || imageObj.fileName || undefined,
      };
    },

    // Currency field (returns number but could be enhanced for currency object)
    currency: (fieldName: string, defaultValue = 0) => {
      if (!item || !fieldName) return defaultValue;
      const value = item[fieldName];
      if (value === null || value === undefined || value === '') return defaultValue;
      const numValue = Number(value);
      return isNaN(numValue) ? defaultValue : numValue;
    },

    // Geolocation field
    geolocation: (fieldName: string) => {
      if (!item || !fieldName) return undefined;
      const geoObj = item[fieldName];
      if (!geoObj || typeof geoObj !== 'object') return undefined;

      return {
        latitude: geoObj.Latitude || geoObj.latitude || undefined,
        longitude: geoObj.Longitude || geoObj.longitude || undefined,
      };
    },

    // JSON field (for modern SharePoint)
    json: (fieldName: string) => {
      if (!item || !fieldName) return undefined;
      const jsonValue = item[fieldName];
      if (jsonValue === null || jsonValue === undefined) return undefined;

      if (typeof jsonValue === 'string') {
        try {
          return JSON.parse(jsonValue);
        } catch {
          return jsonValue;
        }
      }

      return jsonValue;
    },

    // Field existence checking
    hasField: (fieldName: string) => {
      if (!item || !fieldName) return false;
      return Object.prototype.hasOwnProperty.call(item, fieldName);
    },

    hasFields: (...fieldNames: string[]) => {
      return fieldNames.every(field => item && Object.prototype.hasOwnProperty.call(item, field));
    },

    missingFields: (...fieldNames: string[]) => {
      if (!item) return fieldNames;
      return fieldNames.filter(field => !Object.prototype.hasOwnProperty.call(item, field));
    },

    // Raw item access
    raw: item,
  };
}
