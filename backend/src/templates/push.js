// geofencing-app/backend/src/templates/push.js

const geofenceEntryTemplate = (employeeName, geofenceName) => ({
    title: 'Geofence Entry',
    body: `${employeeName} has entered the geofence "${geofenceName}".`,
  });
  
  const geofenceExitTemplate = (employeeName, geofenceName) => ({
    title: 'Geofence Exit',
    body: `${employeeName} has exited the geofence "${geofenceName}".`,
  });
  
  const attendanceReminderTemplate = (employeeName, date) => ({
    title: 'Attendance Reminder',
    body: `Hi ${employeeName}, don't forget to log your attendance for ${date}.`,
  });
  
  const taskAssignmentTemplate = (employeeName, taskTitle) => ({
    title: 'New Task Assigned',
    body: `${employeeName}, you have been assigned a new task: "${taskTitle}".`,
  });
  
  module.exports = {
    geofenceEntryTemplate,
    geofenceExitTemplate,
    attendanceReminderTemplate,
    taskAssignmentTemplate,
  };