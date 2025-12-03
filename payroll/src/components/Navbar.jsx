import React from "react";
import { MdOutlineSearch } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { setOpenSidebar } from "../redux/slices/authSlice";
import UserAvatar from "./UserAvatar";
import NotificationPanel from "./NotificationPanel";
import bgImage from '../assets/pilipinas.png'; // adjust path if needed

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // ADDED CODE: Safe user extraction for debugging
  const safeUser = user || JSON.parse(localStorage.getItem("auth_user_v1") || "{}");
  console.log("Navbar - Current user:", safeUser);

  return (
    <div
      className='flex justify-between items-center px-4 py-3 2xl:py-4 sticky z-10 top-0'
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '100px', // adjust height as you like
      }}
    >
      <div className='flex gap-4'>
        <button
          onClick={() => dispatch(setOpenSidebar(true))}
          className='text-2xl text-gray-500 block md:hidden'
        >
          ☰
        </button>

        
      </div>

      <div className='flex gap-2 items-center'>
        <UserAvatar />
      </div>
    </div>
  );
};

export default Navbar;