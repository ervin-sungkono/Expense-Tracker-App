'use client'
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import TransactionCard from './TransactionCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Image from 'next/image';
import { formatCurrency, formatDateString } from '@lib/utils';
import { useDynamicItemSize } from '@lib/hooks';
import DynamicRow from '../common/DynamicRow';

const renderItem = (item) => {
  if(!item) return <div className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
    <div className='flex flex-col gap-1.5 py-2'>
      <div className='flex justify-between items-center'>
        <p className='font-semibold text-sm md:text-base'>{formatDateString(item.date)}</p>
        <p className={`font-semibold text-sm md:text-base ${item.totalAmount < 0 ? 'text-red-500 dark:text-red-400' : 'text-ocean-blue'}`}>{formatCurrency(item.totalAmount)}</p>
      </div>
      <div className='bg-light dark:bg-neutral-800 rounded-md'>
        {item.data?.map(transaction => (
          <TransactionCard key={transaction.id} transaction={transaction}/>
        ))}
      </div>
    </div>
  );
};

const VirtualizedTransactionList = ({ scrollRef, items, loadMore, hasNextPage }) => {
  const isItemLoaded = index => !hasNextPage || index < items.length;
  const { listRef, setSize, getSize, resetAfterIndex } = useDynamicItemSize();

  if(!items) {
    return (
      <div className='w-full h-full flex flex-col justify-center items-center gap-4 rounded-lg px-4 py-2.5'>
        <LoadingSpinner/>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base text-center'>Loading transaction data..</p>
      </div>
    )
  }
  if(items.length === 0 && !hasNextPage) {
    return(
      <div className='w-full h-full flex flex-col justify-center items-center text-center gap-2 rounded-lg px-4 py-2.5'>
        <div className='relative w-full aspect-[16/10]'>
          <Image fill src={'/not-found.png'} alt='' className='object-contain opacity-60 saturate-0'/>
        </div>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No transaction found..</p>
      </div>
    )
  }
  return (
    <AutoSizer
      onResize={() => {
        resetAfterIndex(0);
      }}
    >
      {({ height, width }) => (
        <InfiniteLoader
          itemCount={hasNextPage ? items.length + 1 : items.length}
          loadMoreItems={loadMore}
          isItemLoaded={isItemLoaded}
        >
          {({ onItemsRendered, ref }) => (
            <VariableSizeList
              height={height}
              width={width}
              itemCount={hasNextPage ? items.length + 1 : items.length}
              itemSize={getSize}
              onItemsRendered={onItemsRendered}
              ref={(ele) => {
                ref(ele);
                listRef.current = ele;
                if(scrollRef) scrollRef.current = ele;
              }}
              itemData={items}
              style={{willChange: 'initial'}}
            >
              {({ data, index, style }) => (
                <div style={style}>
                  <DynamicRow
                    data={data}
                    index={index}
                    setSize={setSize}
                    windowWidth={width}
                    renderItem={renderItem}
                  />
                </div>
              )}
            </VariableSizeList>
          )}
        </InfiniteLoader>
      )}
    </AutoSizer>
  );
};

export default VirtualizedTransactionList;