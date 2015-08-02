//
//  NSMutableArray+Queue.h
//  DVC-MobileClient-iOS
//

#import <Foundation/Foundation.h>

@interface NSMutableArray (Queue)

- (id)dequeue;
- (void)enqueue:(id)newObject;

@end
