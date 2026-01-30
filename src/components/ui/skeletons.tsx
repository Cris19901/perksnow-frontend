import { Skeleton } from './skeleton';
import { Card } from './card';

/**
 * Skeleton for a post card in the feed
 */
export function PostSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          {/* Username and time */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          {/* Content */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          {/* Image placeholder */}
          <Skeleton className="h-48 w-full rounded-lg" />
          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton for a reel card
 */
export function ReelSkeleton() {
  return (
    <div className="aspect-[9/16] relative rounded-lg overflow-hidden">
      <Skeleton className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a product card
 */
export function ProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-20" />
      </div>
    </Card>
  );
}

/**
 * Skeleton for a user list item
 */
export function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * Skeleton for a stat card (admin dashboard)
 */
export function StatCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
    </Card>
  );
}

/**
 * Skeleton for a notification item
 */
export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a message item
 */
export function MessageSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/**
 * Skeleton for a comment
 */
export function CommentSkeleton() {
  return (
    <div className="flex items-start gap-2 py-2">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton list with configurable count
 */
interface SkeletonListProps {
  count?: number;
  type: 'post' | 'reel' | 'product' | 'user' | 'notification' | 'message' | 'comment' | 'stat';
}

export function SkeletonList({ count = 3, type }: SkeletonListProps) {
  const skeletonMap = {
    post: PostSkeleton,
    reel: ReelSkeleton,
    product: ProductSkeleton,
    user: UserSkeleton,
    notification: NotificationSkeleton,
    message: MessageSkeleton,
    comment: CommentSkeleton,
    stat: StatCardSkeleton,
  };

  const SkeletonComponent = skeletonMap[type];

  return (
    <div className={type === 'stat' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-4'}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  );
}
