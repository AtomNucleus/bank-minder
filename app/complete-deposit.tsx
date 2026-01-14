'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Camera, Download, Upload, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DepositReceipt {
  id: string;
  timestamp: string;
  imageData: string;
  amount?: number;
  notes?: string;
}

export default function CompleteDeposit() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<DepositReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
      console.error('Camera error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraOpen(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.95);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save receipt
  const saveReceipt = async () => {
    if (!capturedImage) {
      setError('Please capture or upload an image first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const receipt: DepositReceipt = {
        id: `receipt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        imageData: capturedImage,
        amount: amount ? parseFloat(amount) : undefined,
        notes: notes || undefined
      };

      // Save to localStorage
      const existingReceipts = JSON.parse(
        localStorage.getItem('depositReceipts') || '[]'
      );
      existingReceipts.push(receipt);
      localStorage.setItem('depositReceipts', JSON.stringify(existingReceipts));

      // Update state
      setReceipts(existingReceipts);
      
      // Reset form
      setCapturedImage(null);
      setAmount('');
      setNotes('');
      setSelectedImage(null);

      // Show success message
      setError(null);
    } catch (err) {
      setError('Failed to save receipt. Please try again.');
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete receipt
  const deleteReceipt = (id: string) => {
    try {
      const updatedReceipts = receipts.filter(receipt => receipt.id !== id);
      setReceipts(updatedReceipts);
      localStorage.setItem('depositReceipts', JSON.stringify(updatedReceipts));
    } catch (err) {
      setError('Failed to delete receipt.');
      console.error('Delete error:', err);
    }
  };

  // Download receipt as image
  const downloadReceipt = (receipt: DepositReceipt) => {
    try {
      const link = document.createElement('a');
      link.href = receipt.imageData;
      link.download = `receipt-${receipt.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to download receipt.');
      console.error('Download error:', err);
    }
  };

  // Export all receipts as JSON
  const exportReceipts = () => {
    try {
      const dataStr = JSON.stringify(receipts, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deposit-receipts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export receipts.');
      console.error('Export error:', err);
    }
  };

  // Load receipts on mount
  React.useEffect(() => {
    const loadReceipts = () => {
      try {
        const stored = localStorage.getItem('depositReceipts');
        if (stored) {
          setReceipts(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Load error:', err);
      }
    };
    loadReceipts();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Deposit</h1>
        <p className="text-gray-600 mb-8">Capture and save deposit receipt images</p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Camera Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Camera Capture</CardTitle>
              <CardDescription>Take a photo of your receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCameraOpen && !capturedImage && (
                <Button
                  onClick={startCamera}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Open Camera
                </Button>
              )}

              {isCameraOpen && (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={capturePhoto}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Capture
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Image Display and Form Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
              <CardDescription>Preview and add deposit information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {capturedImage && (
                <div className="relative">
                  <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={capturedImage}
                      alt="Captured receipt"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setCapturedImage(null);
                      setAmount('');
                      setNotes('');
                    }}
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {capturedImage && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deposit Amount ($)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional notes..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <Button
                    onClick={saveReceipt}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Saving...' : 'Save Receipt'}
                  </Button>
                </div>
              )}

              {!capturedImage && (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Capture or upload an image to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saved Receipts Section */}
        {receipts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Saved Receipts</CardTitle>
                <CardDescription>{receipts.length} receipt(s) saved</CardDescription>
              </div>
              <Button
                onClick={exportReceipts}
                variant="outline"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receipts.map((receipt) => (
                  <Card key={receipt.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative w-full h-48 bg-gray-100 cursor-pointer group">
                      <Image
                        src={receipt.imageData}
                        alt={`Receipt ${receipt.id}`}
                        fill
                        className="object-cover"
                        onClick={() => setSelectedImage(receipt.imageData)}
                      />
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity" />
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">
                          {new Date(receipt.timestamp).toLocaleString()}
                        </p>
                        {receipt.amount && (
                          <p className="text-lg font-semibold text-green-600">
                            ${receipt.amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      {receipt.notes && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {receipt.notes}
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => downloadReceipt(receipt)}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                        <Button
                          onClick={() => deleteReceipt(receipt.id)}
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {receipts.length === 0 && !capturedImage && (
          <Card className="text-center py-12">
            <CardContent>
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-gray-500">No receipts saved yet. Start by capturing a photo!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-2xl h-auto" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage}
              alt="Full receipt"
              width={800}
              height={600}
              className="w-full h-auto rounded-lg"
            />
            <Button
              onClick={() => setSelectedImage(null)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
