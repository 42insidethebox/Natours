import axios from 'axios';
import { showAlert } from './alerts';
export const bookTour = async (tourId) => {
  try {
    // 1) Get session from server from endpoint
    const stripe = Stripe(
      `pk_test_51M6AhPD89qrOoyFfAEQJ3kasSmoHTjeUy911aqcc4mLVVgi6Fo3qaSBjZlnWDIjJOXCznIWsDVnuPj77YXosYmYE00IvDIJPE6`
    );

    const session = await axios(`api/v1/bookings/checkout-session/${tourId}`);

    console.log(`this is session `);
    console.log(session);

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });

    // 2) Create from + charge cc
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
