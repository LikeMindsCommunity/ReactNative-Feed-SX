import React, {useEffect, useLayoutEffect, useState} from 'react';
import {Image, SafeAreaView, Text, TouchableOpacity, View} from 'react-native';
import {lmFeedClient} from '../../..';
import {
  AddPostRequest,
  GetFeedRequest,
  LikePostRequest,
  PinPostRequest,
  SavePostRequest,
} from 'likeminds-sdk';
import {useDispatch} from 'react-redux';
import {
  autoPlayPostVideo,
  clearFeed,
  getFeed,
  getMemberState,
  initiateUser,
  likePost,
  likePostStateHandler,
  pinPost,
  pinPostStateHandler,
  savePost,
  savePostStateHandler,
} from '../../store/actions/feed';
import {navigationRef} from '../../navigation/RootNavigation';
import {useAppSelector} from '../../store/store';
import {FlashList} from '@shopify/flash-list';
import {styles} from './styles';
import {
  LMHeader,
  LMIcon,
  LMImage,
  LMPost,
  LMVideo,
} from '../../../LikeMinds-ReactNative-Feed-UI';
import {NavigationService} from '../../navigation';
import {
  APP_TITLE,
  DELETE_POST_MENU_ITEM,
  DOCUMENT_ATTACHMENT_TYPE,
  IMAGE_ATTACHMENT_TYPE,
  PIN_POST_MENU_ITEM,
  POST_TYPE,
  POST_UPLOADING,
  REPORT_POST_MENU_ITEM,
  UNPIN_POST_MENU_ITEM,
  VIDEO_ATTACHMENT_TYPE,
} from '../../constants/strings';
import {DeleteModal, ReportModal} from '../../customModals';
import LMLoader from '../../../LikeMinds-ReactNative-Feed-UI/src/base/LMLoader';
import {postLikesClear} from '../../store/actions/postLikes';
import {setUploadAttachments, addPost} from '../../store/actions/createPost';
import { CREATE_POST, LIKES_LIST } from '../../constants/screenNames';
import { uploadFilesToAWS } from '../../utils';
import STYLES from '../../constants/styles';

const UniversalFeed = () => {
  const dispatch = useDispatch();
  const feedData = useAppSelector(state => state.feed.feed);
  const {mediaAttachmemnts, linkAttachments, postContent} = useAppSelector(
    state => state.createPost,
  );
  const showLoader = useAppSelector(state => state.loader.count);
  const [feedPageNumber, setFeedPageNumber] = useState(1);
  const [communityId, setCommunityId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [modalPosition, setModalPosition] = useState({x: 0, y: 0});
  const [showActionListModal, setShowActionListModal] = useState(false);
  const [selectedMenuItemPostId, setSelectedMenuItemPostId] = useState('');
  const [showDeleteModal, setDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const memberData = useAppSelector(state => state.feed.member);
  const [postUploading, setPostUploading] = useState(false);
  let uploadingMediaAttachmentType = mediaAttachmemnts[0]?.attachmentType;
  let uploadingMediaAttachment = mediaAttachmemnts[0]?.attachmentMeta.url;

  // this function calls initiate user API and sets the access token and community id
  async function getInitialData() {
    //this line of code is for the sample app only, pass your userUniqueID instead of this.
    // todo: remove static data
    // const UUID = await AsyncStorage.getItem('userUniqueID');
    const UUID = '0e53748a-969b-44c6-b8fa-a4c8e1eb1208';

    let payload = {
      userUniqueId: UUID, // user unique ID
      userName: 'abc', // user name
      isGuest: false,
    };
    // calling initiateUser API
    let initiateResponse = await dispatch(initiateUser(payload) as any);
    if (!!initiateResponse) {
      // calling getMemberState API
      await dispatch(getMemberState() as any);
      setFeedPageNumber(1);
      setCommunityId(initiateResponse?.community?.id);
      setAccessToken(initiateResponse?.accessToken);
    }
    return initiateResponse;
  }

  // this functions gets universal feed data
  async function fetchFeed() {
    let payload = {
      page: feedPageNumber,
      pageSize: 20,
    };
    // calling getFeed API
    let getFeedResponse = await dispatch(
      getFeed(
        GetFeedRequest.builder()
          .setpage(payload.page)
          .setpageSize(payload.pageSize)
          .build(),
      ) as any,
    );
    return getFeedResponse;
  }

  // this useEffect handles the execution of addPost api
  useEffect(() => {
    // this checks if any media is selected to be posted and then executes the addPost api
    if (
      mediaAttachmemnts.length > 0 ||
      linkAttachments.length > 0 ||
      postContent != ''
    ) {
      setPostUploading(true);
      postAdd();
    }
  }, [mediaAttachmemnts, linkAttachments, postContent]);

  // this function adds a new post
  const postAdd = async () => {
    const uploadPromises = mediaAttachmemnts.map(
      async (item: LMAttachmentUI) => {
        return uploadFilesToAWS(item.attachmentMeta, memberData.userUniqueId).then(
          res => {
            item.attachmentMeta.url = res.Location;
            return item; // Return the updated item
          },
        );
      },
    );
    // Wait for all upload operations to complete
    const updatedAttachments = await Promise.all(uploadPromises);
    let addPostResponse = await dispatch(
      addPost(
        AddPostRequest.builder()
          .setAttachments([...updatedAttachments, ...linkAttachments])
          .setText(postContent)
          .build(),
      ) as any,
    );
    if (addPostResponse) {
      dispatch(
        setUploadAttachments({
          allAttachment: [],
          linkData: [],
          conText: '',
        }) as any,
      );
      setPostUploading(false);
      await dispatch(clearFeed() as any);
      setFeedPageNumber(1);
      setTimeout(() => {
        fetchFeed();
      }, 1000);
    }
    return addPostResponse;
  };

  // this functions hanldes the post like functionality
  async function postLikeHandler(id: string) {
    let payload = {
      postId: id,
    };
    dispatch(likePostStateHandler(payload.postId) as any);
    // calling like post api
    let postLikeResponse = await dispatch(
      likePost(
        LikePostRequest.builder().setpostId(payload.postId).build(),
      ) as any,
    );
    if (postLikeResponse) {
    }
    return postLikeResponse;
  }

  // this functions hanldes the post save functionality
  async function savePostHandler(id: string) {
    let payload = {
      postId: id,
    };
    dispatch(savePostStateHandler(payload.postId) as any);
    // calling the save post api
    let savePostResponse = await dispatch(
      savePost(
        SavePostRequest.builder().setpostId(payload.postId).build(),
      ) as any,
    );
    if (savePostResponse) {
    }
    return savePostResponse;
  }

  useLayoutEffect(() => {
    getInitialData();
  }, [navigationRef, lmFeedClient]);

  // this calls the getFeed api whenever the page number gets changed
  useEffect(() => {
    if (accessToken) {
      fetchFeed();
    }
  }, [accessToken, feedPageNumber]);

  // this function closes the post action list modal
  const closePostActionListModal = () => {
    setShowActionListModal(false);
  };

  // this function handles the functionality on the pin option
  const handlePinPost = async (id: string) => {
    let payload = {
      postId: id,
    };
    dispatch(pinPostStateHandler(payload.postId) as any);
    let pinPostResponse = await dispatch(
      pinPost(
        PinPostRequest.builder().setpostId(payload.postId).build(),
      ) as any,
    );
    return pinPostResponse;
  };

  // this function handles the functionality on the report option
  const handleReportPost = async () => {
    setShowReportModal(true);
  };

  // this function handles the functionality on the delete option
  const handleDeletePost = async (visible: boolean) => {
    setDeleteModal(visible);
  };

  // this function returns the id of the item selected from menu list and handles further functionalities accordingly
  const onMenuItemSelect = (postId: string, itemId?: number) => {
    setSelectedMenuItemPostId(postId);
    if (itemId === PIN_POST_MENU_ITEM || itemId === UNPIN_POST_MENU_ITEM) {
      handlePinPost(postId);
    }
    if (itemId === REPORT_POST_MENU_ITEM) {
      handleReportPost();
    }
    if (itemId === DELETE_POST_MENU_ITEM) {
      handleDeletePost(true);
    }
  };

  // this function gets the detail pf post whose menu item is clicked
  const getPostDetail = () => {
    const postDetail = feedData.find(
      (item: LMPostUI) => item.id === selectedMenuItemPostId,
    );
    return postDetail;
  };

  return (
    <SafeAreaView style={{height: '100%'}}>
      {/* header */}
      <LMHeader heading={APP_TITLE} />
      {/* post uploading section */}
      {postUploading && (
        <View
          style={styles.postUploadingView}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {/* post uploading media preview */}
            {uploadingMediaAttachmentType === IMAGE_ATTACHMENT_TYPE && (
              <LMImage
                imageUrl={uploadingMediaAttachment}
                imageStyle={{backgroundColor: '#fff'}}
                boxStyle={styles.uploadingImageVideoBox}
                width={styles.uploadingImageVideoBox.width}
                height={styles.uploadingImageVideoBox.height}
              />
            )}
            {uploadingMediaAttachmentType === VIDEO_ATTACHMENT_TYPE && (
              <LMVideo
                videoUrl={uploadingMediaAttachment}
                videoStyle={{backgroundColor: '#fff'}}
                boxStyle={styles.uploadingImageVideoBox}
                width={styles.uploadingImageVideoBox.width}
                height={styles.uploadingImageVideoBox.height}
                showControls={false}
                boxFit="contain"
              />
            )}
            {uploadingMediaAttachmentType === DOCUMENT_ATTACHMENT_TYPE && (
              <LMIcon
                assetPath={require('../../assets/images/pdf_icon3x.png')}
                type="png"
                iconStyle={{marginRight: 2, resizeMode: 'contain'}}
                height={styles.uploadingPdfIconSize.height}
                width={styles.uploadingPdfIconSize.width}
              />
            )}
            <Text>{POST_UPLOADING}</Text>
          </View>
          {/* progress loader */}
          <LMLoader size={STYLES.$LMLoaderSize} />
        </View>
      )}
      {/* posts list section */}
      {feedData?.length > 0 ? (
        <FlashList
          data={feedData}
          renderItem={({item}: {item: LMPostUI}) => (
            <LMPost
              post={item}
              // header props
              headerProps={{
                post: item,
                postMenu: {
                  postId: item?.id,
                  menuItems: item?.menuItems,
                  modalPosition: modalPosition,
                  modalVisible: showActionListModal,
                  onCloseModal: closePostActionListModal,
                  onSelected: (postId, itemId) =>
                    onMenuItemSelect(postId, itemId),
                },
                onTap: () => {},
                showMenuIcon: true,
                showMemberStateLabel: true,
              }}
              // footer props
              footerProps={{
                isLiked: item?.isLiked,
                isSaved: item?.isSaved,
                likesCount: item?.likesCount,
                commentsCount: item?.commentsCount,
                showBookMarkIcon: true,
                showShareIcon: true,
                likeIconButton: {
                  onTap: () => {
                    postLikeHandler(item?.id);
                  },
                },
                saveButton: {
                  onTap: () => {
                    savePostHandler(item?.id);
                  },
                },
                likeTextButton: {
                  onTap: () => {
                    dispatch(postLikesClear() as any);
                    NavigationService.navigate(LIKES_LIST, item?.id);
                  },
                },
              }}
              mediaProps={{
                attachments: item?.attachments ? item.attachments : [],
                videoProps: {videoUrl: '', showControls: true},
                carouselProps: {
                  attachments: item?.attachments ? item.attachments : [],
                  videoItem: {videoUrl: '', showControls: true},
                },
              }}
            />
          )}
          estimatedItemSize={500}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            setFeedPageNumber(feedPageNumber + 1);
          }}
          ListFooterComponent={() => {
            return <>{showLoader > 0 && <LMLoader />}</>;
          }}
          onViewableItemsChanged={({changed, viewableItems}) => {
            if (changed) {
              if (viewableItems) {
                dispatch(autoPlayPostVideo(viewableItems[0]?.item.id) as any);
              }
            }
          }}
          viewabilityConfig={{viewAreaCoveragePercentThreshold: 60}}
        />
      ) : (
        <View
          style={{
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <LMLoader />
        </View>
      )}
      {/* create post button section */}
      <TouchableOpacity
        disabled={postUploading}
        style={styles.newPostButtonView}
        onPress={() => NavigationService.navigate(CREATE_POST)}>
        <Image
          source={require('../../assets/images/add_post_icon3x.png')}
          resizeMode={'contain'}
          style={{width: 30, height: 30}}
        />
        <Text style={styles.newPostText}>NEW POST</Text>
      </TouchableOpacity>
      {/* delete post modal */}
      {showDeleteModal && (
        <DeleteModal
          visible={showDeleteModal}
          displayModal={visible => handleDeletePost(visible)}
          deleteType={POST_TYPE}
          postDetail={getPostDetail()}
        />
      )}
      {/* report post modal */}
      {showReportModal && (
        <ReportModal
          visible={showReportModal}
          closeModal={() => setShowReportModal(false)}
          reportType={POST_TYPE}
          postDetail={getPostDetail()}
        />
      )}
    </SafeAreaView>
  );
};

export default UniversalFeed;
