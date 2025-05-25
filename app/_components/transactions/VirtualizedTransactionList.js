'use client'
import { memo } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import TransactionCard from './TransactionCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Image from 'next/image';

const Row = ({ index, style, data }) => {
  const item = data[index];

  if(!item) return <div style={style} className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
      <TransactionCard transaction={item} style={style}/>
  );
};

const MemoizedRow = memo(Row);

const VirtualizedTransactionList = ({ items, loadMore, hasNextPage }) => {
  const isItemLoaded = index => !hasNextPage || index < items.length;

  if(!items) {
    return (
      <div className='w-full h-full flex flex-col justify-center items-center gap-4 bg-neutral-200 dark:bg-neutral-700 rounded-lg px-4 py-2.5'>
        <LoadingSpinner/>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base text-center'>Loading transaction data..</p>
      </div>
    )
  }
  if(items.length === 0 && !hasNextPage) {
    return(
      <div className='w-full h-full flex flex-col justify-center items-center text-center gap-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg px-4 py-2.5'>
        <div className='relative w-full aspect-[16/10]'>
          <Image fill src={'/not-found.png'} alt='' className='object-contain opacity-60 saturate-0'/>
        </div>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No transaction found..</p>
      </div>
    )
  }
  return (
    <AutoSizer>
      {({ height, width }) => (
        <InfiniteLoader
          itemCount={hasNextPage ? items.length + 1 : items.length}
          loadMoreItems={loadMore}
          isItemLoaded={isItemLoaded}
        >
          {({ onItemsRendered, ref }) => (
            <FixedSizeList
              height={height}
              width={width}
              itemCount={hasNextPage ? items.length + 1 : items.length}
              itemSize={60}
              onItemsRendered={onItemsRendered}
              ref={ref}
              itemData={items}
              className='bg-neutral-200 dark:bg-neutral-700 rounded-lg'
              style={{willChange: 'initial'}}
            >
              {MemoizedRow}
            </FixedSizeList>
          )}
        </InfiniteLoader>
      )}
    </AutoSizer>
  );
};

export default VirtualizedTransactionList;