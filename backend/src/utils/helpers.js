const crypto = require('crypto');
const { format } = require('date-fns');

/**
 * Date and Time Helpers
 */
const dateHelpers = {
  formatDate: (date, pattern = 'yyyy-MM-dd') => {
    return format(date, pattern);
  },

  formatTime: (date, pattern = 'HH:mm:ss') => {
    return format(date, pattern);
  },

  formatDateTime: (date, pattern = 'yyyy-MM-dd HH:mm:ss') => {
    return format(date, pattern);
  },

  isWorkingHour: (time, schedule) => {
    if (!schedule.workHours) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    
    const [startHours, startMinutes] = schedule.workHours.start.split(':').map(Number);
    const [endHours, endMinutes] = schedule.workHours.end.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    return currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes;
  },

  isWorkingDay: (date, workDays) => {
    const dayOfWeek = format(date, 'EEEE');
    return workDays.includes(dayOfWeek);
  },

  getDateRange: (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= new Date(endDate)) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }
};

/**
 * Geolocation Helpers
 */
const geoHelpers = {
  calculateDistance: (point1, point2) => {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  },

  isPointInCircle: (point, center, radius) => {
    const distance = geoHelpers.calculateDistance(point, center);
    return distance <= radius;
  },

  formatCoordinates: (coordinates) => {
    return {
      type: 'Point',
      coordinates: [
        parseFloat(coordinates.longitude),
        parseFloat(coordinates.latitude)
      ]
    };
  },

  calculateBoundingBox: (center, radiusInMeters) => {
    const [lat, lon] = center;
    const R = 6371e3; // Earth's radius in meters
    
    const latChange = (radiusInMeters / R) * (180 / Math.PI);
    const lonChange = (radiusInMeters / R) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    
    return {
      minLat: lat - latChange,
      maxLat: lat + latChange,
      minLon: lon - lonChange,
      maxLon: lon + lonChange
    };
  }
};

/**
 * String Helpers
 */
const stringHelpers = {
  generateRandomString: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  generateSlug: (str) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },

  maskEmail: (email) => {
    const [name, domain] = email.split('@');
    const maskedName = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    return `${maskedName}@${domain}`;
  },

  maskPhone: (phone) => {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
};

/**
 * Array Helpers
 */
const arrayHelpers = {
  chunk: (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  groupBy: (array, key) => {
    return array.reduce((acc, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      acc[groupKey] = acc[groupKey] || [];
      acc[groupKey].push(item);
      return acc;
    }, {});
  },

  unique: (array, key) => {
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    return [...new Set(array)];
  }
};

/**
 * Object Helpers
 */
const objectHelpers = {
  pick: (object, keys) => {
    return keys.reduce((acc, key) => {
      if (object.hasOwnProperty(key)) {
        acc[key] = object[key];
      }
      return acc;
    }, {});
  },

  omit: (object, keys) => {
    return Object.keys(object)
      .filter(key => !keys.includes(key))
      .reduce((acc, key) => {
        acc[key] = object[key];
        return acc;
      }, {});
  },

  deepClone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },

  flattenObject: (obj, prefix = '') => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(acc, objectHelpers.flattenObject(value, newKey));
      } else {
        acc[newKey] = value;
      }
      return acc;
    }, {});
  }
};

/**
 * File Helpers
 */
const fileHelpers = {
  getFileExtension: (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  generateUniqueFilename: (originalFilename) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const extension = fileHelpers.getFileExtension(originalFilename);
    return `${timestamp}-${random}.${extension}`;
  }
};

module.exports = {
  dateHelpers,
  geoHelpers,
  stringHelpers,
  arrayHelpers,
  objectHelpers,
  fileHelpers
};