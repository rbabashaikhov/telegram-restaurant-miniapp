import type { DemoTourDefinition } from './types';

export const restaurantDemoTour: DemoTourDefinition = {
  id: 'nord-bistro-sales',
  storageKey: 'nord-bistro-demo-tour',
  intro: {
    title: 'Один Mini App вместо трёх приложений',
    lead: 'Бронь, заказ, повторный визит и лояльность — в том же канале, где гость уже есть.',
    bullets: [
      'Живой availability, не картинка меню',
      'Предзаказ к ужину',
      'Возврат гостя и бонусы',
    ],
    startLabel: 'Показать сценарий',
    skipLabel: 'Смотреть самостоятельно',
  },
  finish: {
    title: 'От стола к повторной выручке',
    lead: 'Гость не скачивает приложение. Ресторан получает бронь, заказ, историю и повод вернуть человека.',
    bullets: [
      'Reservation + preorder',
      'Repeat order',
      'Loyalty ledger',
      'Admin на тех же данных',
    ],
    adminLabel: 'Открыть demo-admin',
    continueLabel: 'Остаться в приложении',
  },
  steps: [
    {
      id: 'home',
      target: 'home-hero',
      route: '/',
      title: 'Канал ресторана',
      description: 'Не электронное меню. Один Mini App для бронирования, заказов и возврата гостей.',
    },
    {
      id: 'friday',
      target: 'reserve-when',
      route: '/reserve',
      action: 'fill-friday',
      title: 'Ужин в пятницу',
      description: '2 гостя, пятница, 19:00, веранда. Слоты считает backend — по столам, capacity и buffer.',
    },
    {
      id: 'occasion',
      target: 'reserve-occasion',
      route: '/reserve?step=occasion',
      title: 'Повод визита',
      description: 'Свидание попадает в бронь и историю гостя. Это данные для CRM, не просто комментарий.',
    },
    {
      id: 'preorder',
      target: 'reserve-preorder',
      route: '/reserve',
      action: 'add-preorder',
      title: 'Предзаказ',
      description: 'Хотите заказать закуски заранее? Блюда связываются с бронью, кухня готовит к приходу.',
    },
    {
      id: 'confirm',
      target: 'reserve-confirm',
      route: '/reserve?step=confirm',
      title: 'Подтверждение',
      description: 'Бронь не создаётся сама. Нажмите «Подтвердить», когда будете готовы.',
    },
    {
      id: 'returning',
      target: 'profile-hero',
      route: '/profile',
      action: 'open-profile',
      title: 'Returning guest',
      description: 'Прошлый визит, карбонара, бонусы и повтор заказа. Главный экран постоянного гостя другой.',
    },
    {
      id: 'admin',
      target: 'admin-value',
      route: '/demo/admin',
      action: 'open-admin',
      title: 'Ценность для ресторана',
      description: 'Guest → Reservation → Order → Repeat → Revenue. Те же live-данные, без права менять их в demo-admin.',
    },
  ],
};
