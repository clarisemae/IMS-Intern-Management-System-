import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Clock, Calendar, Download } from 'lucide-react';

export function AttendancePage() {
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [currentTime, setCurrentTime] = useState('09:00 AM');

  // Mock attendance history
  const attendanceHistory = [
    { date: '2026-01-31', timeIn: '09:00 AM', timeOut: '--:--', hours: '--', status: 'active' },
    { date: '2026-01-30', timeIn: '08:45 AM', timeOut: '05:15 PM', hours: '8.5', status: 'completed' },
    { date: '2026-01-29', timeIn: '09:10 AM', timeOut: '05:00 PM', hours: '7.8', status: 'completed' },
    { date: '2026-01-28', timeIn: '08:55 AM', timeOut: '05:20 PM', hours: '8.4', status: 'completed' },
    { date: '2026-01-27', timeIn: '09:00 AM', timeOut: '05:00 PM', hours: '8.0', status: 'completed' },
    { date: '2026-01-24', timeIn: '08:50 AM', timeOut: '05:10 PM', hours: '8.3', status: 'completed' },
    { date: '2026-01-23', timeIn: '09:05 AM', timeOut: '05:05 PM', hours: '8.0', status: 'completed' },
  ];

  const handleClockAction = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setCurrentTime(timeString);
    setIsClockedIn(!isClockedIn);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Attendance</h1>
          <p className="text-gray-600 mt-1">Track your daily attendance and hours</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock In/Out Card */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>Saturday, January 31, 2026</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Time Display */}
              <div className="text-center py-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <Clock className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                <p className="text-4xl font-semibold mb-2">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-gray-600">Current Time</p>
              </div>

              {/* Status and Time */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant={isClockedIn ? 'default' : 'secondary'}>
                    {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Time In</span>
                  <span className="font-medium">{currentTime}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                onClick={handleClockAction}
                className="w-full"
                size="lg"
                variant={isClockedIn ? 'destructive' : 'default'}
              >
                <Clock className="w-5 h-5 mr-2" />
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Attendance History */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>Your recent attendance records</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceHistory.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell>{record.timeIn}</TableCell>
                        <TableCell>{record.timeOut}</TableCell>
                        <TableCell>{record.hours === '--' ? '--' : `${record.hours} hrs`}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'active' ? 'default' : 'secondary'}>
                            {record.status === 'active' ? 'Active' : 'Completed'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-2xl font-semibold">156.5</p>
                  <p className="text-sm text-gray-600 mt-1">Total Hours</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">38</p>
                  <p className="text-sm text-gray-600 mt-1">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">78%</p>
                  <p className="text-sm text-gray-600 mt-1">Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}