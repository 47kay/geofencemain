const sendGeofenceEntrySMS = async (employee, geofence, time) => {
    const smsContent = smsTemplates.geofenceEntryTemplate(employee.name, geofence.name, time);
    await sendSMS({
      phoneNumber: employee.phoneNumber,
      message: smsContent,
    });
  };
  
  const sendGeofenceExitSMS = async (employee, geofence, time) => {
    const smsContent = smsTemplates.geofenceExitTemplate(employee.name, geofence.name, time);
    await sendSMS({
      phoneNumber: employee.phoneNumber,
      message: smsContent,
    });
  };
  
  const sendAttendanceReminderSMS = async (employee, date) => {
    const smsContent = smsTemplates.attendanceReminderTemplate(employee.name, date);
    await sendSMS({
      phoneNumber: employee.phoneNumber,
      message: smsContent,
    });
  };