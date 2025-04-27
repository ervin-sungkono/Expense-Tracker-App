import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from 'swiper/modules'

import 'swiper/css'

export default function SwiperContainer({ spaceBetween = 0, slidesPerView = 1, items = [] }) {
    if(items.length === 0) return
    return(
        <Swiper
            spaceBetween={spaceBetween}
            slidesPerView={slidesPerView}
            freeMode={true}
            modules={[FreeMode]}
            className="swiper"
        >
            {items.map(item => (
                <SwiperSlide key={item.id}>{item.component}</SwiperSlide>
            ))}
        </Swiper>
    )
}