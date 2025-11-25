import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProcessingStatus } from "@/types/meeting";
import { Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ProcessingStatusBannerProps {
  status: ProcessingStatus;
  onRetry?: () => void;
}

export const ProcessingStatusBanner = ({ status, onRetry }: ProcessingStatusBannerProps) => {
  if (status.status === 'PROCESSED') {
    return (
      <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Processing Complete
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Meeting has been successfully processed and is ready to view
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.status === 'FAILED') {
    return (
      <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Processing Failed
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {status.message || "An error occurred during processing"}
              </p>
            </div>
            {onRetry && (
              <Button onClick={onRetry} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // PROCESSING status
  return (
    <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                Processing Meeting
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {status.message}
              </p>
            </div>
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              {status.progress}%
            </span>
          </div>

          <Progress value={status.progress} className="h-2" />

          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
            <span>Current Step: {status.currentStep}</span>
            {status.estimatedCompletion && (
              <span>Est. completion: {new Date(status.estimatedCompletion).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
